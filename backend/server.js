import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/analyses", analysisRoutes);

app.use("/api", notFound);
app.use(errorHandler);

await connectDB();

// On Vercel the exported app runs as a function; locally it listens on a port.
if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

export default app;
