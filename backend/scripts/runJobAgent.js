// Runs the job-match agent on a saved analysis and prints the ranked matches.
//
//   npm run job-agent                 uses the most recent analysis
//   npm run job-agent -- <analysisId> uses that one
//   npm run job-agent -- --resume <runId>  resumes an unfinished run
import mongoose from "mongoose";
import { config } from "../config/index.js";
import { connectDB } from "../config/db.js";
import { Analysis } from "../models/Analysis.js";
import { JobMatch } from "../models/JobMatch.js";
import { createRun, runJob } from "../service/jobAgent.js";

const args = process.argv.slice(2);

if (!config.mongoUri) {
  console.error("Set MONGODB_URI in backend/.env first.");
  process.exit(1);
}
await connectDB();

try {
  let runId;
  if (args[0] === "--resume") {
    runId = args[1];
  } else {
    const analysis = args[0] ? await Analysis.findById(args[0]) : await Analysis.findOne().sort({ createdAt: -1 });
    if (!analysis) throw new Error(args[0] ? `No analysis with id ${args[0]}.` : "No analyses yet. Check a resume in the app first.");
    console.log(`Analysis ${analysis.id} (${analysis.fileName})`);
    runId = (await createRun(analysis, { clientKey: "script" })).run.id;
  }

  console.log(`Run ${runId}: searching and scoring...`);
  const started = Date.now();
  const run = await runJob(runId);

  console.log(`\nStatus: ${run.status} in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  console.log(`Profile: ${JSON.stringify(run.searchProfile)}`);
  console.log(`Broaden level: ${run.broadenLevel}`);
  console.log(`Found ${run.progress.found}, scored ${run.progress.scored} of ${run.progress.target}, skipped ${run.progress.skipped}`);
  for (const { source, message } of run.sourceErrors) console.log(`Source failed: ${source}: ${message}`);
  if (run.error) console.log(`Error: ${run.error}`);

  const matches = await JobMatch.find({ run: run._id }).sort({ score: -1 }).populate("job");
  console.table(
    matches.map((m) => ({
      score: m.score,
      title: m.job.title.slice(0, 40),
      company: m.job.company?.slice(0, 24),
      location: m.job.location?.slice(0, 24),
      engine: m.engine,
    }))
  );
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
