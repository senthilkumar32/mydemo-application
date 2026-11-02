import mongoose from "mongoose";
import { config } from "../config/index.js";
import { Analysis } from "../models/Analysis.js";
import { JobMatch } from "../models/JobMatch.js";
import { FINISHED_STATUSES, JobRun } from "../models/JobRun.js";
import { User } from "../models/User.js";
import { HttpError } from "../utils.js";
import { createRun, hashToken, runInBackground } from "./jobAgent.js";
import { enabledProviders, providerStatus } from "./jobProviders/index.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Starts a background run for an analysis, within the caller's daily limit.
// The token comes back only for anonymous runs; signed-in users use their session.
export async function startRun({ analysis, clientKey, filters, trigger }) {
  if (!enabledProviders().length) throw new HttpError(503, "Job matching isn't available right now.");

  const recent = await JobRun.countDocuments({ clientKey, createdAt: { $gte: new Date(Date.now() - DAY_MS) } });
  if (recent >= config.jobRunsPerDay) {
    throw new HttpError(429, `You've reached today's limit of ${config.jobRunsPerDay} job searches. Try again tomorrow.`);
  }

  const { run, token } = await createRun(analysis, { clientKey, filters, trigger });
  runInBackground(run.id);
  return { ...run.toPublic(), token: analysis.user ? undefined : token };
}

// A new run (a retry, or new filters) for an analysis the caller can see.
export async function startRunForAnalysis({ analysisId, userId, token, clientKey, filters }) {
  const analysis = mongoose.isValidObjectId(analysisId) ? await Analysis.findById(analysisId) : null;
  if (!analysis || !(await canUseAnalysis(analysis, userId, token))) {
    throw new HttpError(404, "We couldn't find that analysis. Check your resume again to search for jobs.", "analysisId");
  }
  return startRun({ analysis, clientKey, filters, trigger: "retry" });
}

// A signed-in user's analysis is theirs alone; an anonymous one is open to
// whoever holds the token of a run already started from it.
async function canUseAnalysis(analysis, userId, token) {
  if (analysis.user) return String(analysis.user) === userId;
  return Boolean(token) && Boolean(await JobRun.exists({ analysis: analysis._id, tokenHash: hashToken(token) }));
}

// The same 404 whether the run is missing or someone else's, so ids can't be probed.
async function findRun(id, userId, token) {
  const run = mongoose.isValidObjectId(id) ? await JobRun.findById(id) : null;
  const allowed = run && (run.user ? String(run.user) === userId : Boolean(token) && hashToken(token) === run.tokenHash);
  if (!allowed) throw new HttpError(404, "We couldn't find that job search. Start a new one from your results.");
  return run;
}

export async function getRun({ id, userId, token, since }) {
  return withMatches(await findRun(id, userId, token), since);
}

export async function latestRun(userId) {
  const run = await JobRun.findOne({ user: userId }).sort({ createdAt: -1 });
  return run ? withMatches(run) : { jobRun: null, matches: [], cursor: null };
}

// The run plus its matches after `since` (the last match id the client has).
// `cursor` is what to send as `since` next time.
async function withMatches(run, since) {
  if (since && !mongoose.isValidObjectId(since)) throw new HttpError(400, "That page of results isn't valid. Reload to start over.");
  const matches = await JobMatch.find({ run: run._id, ...(since && { _id: { $gt: since } }) })
    .sort({ _id: 1 })
    .populate("job");
  return {
    jobRun: run.toPublic(),
    // A job can expire (30-day TTL) before an old run does.
    matches: matches.filter((m) => m.job).map((m) => m.toPublic()),
    cursor: matches.at(-1)?.id ?? since ?? null,
  };
}

// Daily refresh: a new run on the latest resume of each user who opted in,
// with their last run's filters. Called by the cron route; a few users per call.
const REFRESH_EVERY_MS = 20 * 60 * 60 * 1000;
const REFRESH_BATCH = 10;

export async function startDailyRefreshes() {
  if (!enabledProviders().length) return [];
  const due = await User.find({
    jobAlerts: true,
    $or: [{ jobAlertsRunAt: null }, { jobAlertsRunAt: { $lt: new Date(Date.now() - REFRESH_EVERY_MS) } }],
  })
    .sort({ jobAlertsRunAt: 1 })
    .limit(REFRESH_BATCH);

  const started = [];
  for (const user of due) {
    // Marked first, so a user whose refresh fails isn't retried on every cron call.
    await User.updateOne({ _id: user._id }, { $set: { jobAlertsRunAt: new Date() } });
    const analysis = await Analysis.findOne({ user: user._id }).sort({ createdAt: -1 });
    if (!analysis) continue;
    const last = await JobRun.findOne({ user: user._id }).sort({ createdAt: -1 });
    const { run } = await createRun(analysis, {
      clientKey: `user:${user.id}`,
      filters: last?.filters?.toObject?.() ?? {},
      trigger: "refresh",
    });
    runInBackground(run.id);
    started.push(run.id);
  }
  return started;
}

// For /api/health: which sources can run, and how often each failed in the last day.
// Counts only; provider error messages stay in the logs.
export async function jobMatchingHealth() {
  const failures = await JobRun.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - DAY_MS) } } },
    { $unwind: "$sourceErrors" },
    { $group: { _id: "$sourceErrors.source", count: { $sum: 1 } } },
  ]);
  const failed = Object.fromEntries(failures.map((f) => [f._id, f.count]));
  const runs = await JobRun.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - DAY_MS) } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return {
    providers: providerStatus().map((p) => ({ ...p, failuresLast24h: failed[p.name] ?? 0 })),
    cronConfigured: Boolean(config.cronSecret),
    runsLast24h: Object.fromEntries(runs.map((r) => [r._id, r.count])),
  };
}

// Stops further scoring; what was already found stays.
export async function cancelRun({ id, userId, token }) {
  const run = await findRun(id, userId, token);
  if (FINISHED_STATUSES.has(run.status)) return run.toPublic();
  const cancelled = await JobRun.findOneAndUpdate(
    { _id: run._id, status: { $nin: [...FINISHED_STATUSES] } },
    { $set: { status: "cancelled", finishedAt: new Date() } },
    { returnDocument: "after" }
  );
  return (cancelled ?? (await JobRun.findById(run._id))).toPublic();
}
