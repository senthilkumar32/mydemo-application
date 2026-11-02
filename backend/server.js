import express from "express";
import cors from "cors";
import { config, missingEnv } from "./config/index.js";
import { connectDB, dbError } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import jobRunRoutes from "./routes/jobRun.routes.js";
import cronRoutes from "./routes/cron.routes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { jobMatchingHealth } from "./service/jobRun.service.js";
import { HttpError } from "./utils.js";

const app = express();
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "100kb" }));

// The pages are served by Vite (or Vercel's frontend service), not by this API.
// Locally, point anyone who opens the API's root at the app instead of "Cannot GET /".
app.get("/", (req, res) => {
  res.type("text").send("This is the Profile Analyzer API. Open the app at http://localhost:5173 (run `npm run dev` from the project root). API status: /api/health");
});

// Reports what's wrong with the setup, so problems can be found without the server logs.
app.get("/api/health", async (req, res) => {
  if (missingEnv.length) {
    return res.status(503).json({ ok: false, problem: `Set these environment variables: ${missingEnv.join(", ")}` });
  }
  try {
    await connectDB();
  } catch {
    res.status(503).json({
      ok: false,
      problem: "Couldn't connect to MongoDB. Check MONGODB_URI and that Atlas Network Access allows 0.0.0.0/0.",
      detail: dbError,
    });
  }
  // Job matching is optional: its state is reported but never makes the API unhealthy.
  const jobMatching = await jobMatchingHealth().catch((err) => ({ problem: `Couldn't read job matching status: ${err.message}` }));
  res.json({ ok: true, jobMatching });
});

// Every other route needs the settings and the database.
app.use("/api", async (req, res, next) => {
  if (missingEnv.length) throw new HttpError(503, "The server isn't set up yet. Try again later.");
  try {
    await connectDB();
  } catch {
    throw new HttpError(503, "We can't reach the database right now. Try again in a minute.");
  }
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/analyses", analysisRoutes);
app.use("/api/job-runs", jobRunRoutes);
app.use("/api/cron", cronRoutes);

app.use("/api", notFound);
app.use(errorHandler);

// On Vercel the exported app runs as a function; locally it listens on a port.
if (!process.env.VERCEL) {
  if (missingEnv.length) {
    console.error(`Missing ${missingEnv.join(", ")}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
  try {
    await connectDB();
  } catch (err) {
    console.error(`Couldn't connect to MongoDB: ${err.message}`);
    console.error("Check MONGODB_URI in backend/.env (see .env.example for the format).");
    process.exit(1);
  }
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

export default app;
