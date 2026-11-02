import crypto from "node:crypto";
import { waitUntil } from "@vercel/functions";
import { config } from "../config/index.js";
import { Analysis } from "../models/Analysis.js";
import { Job } from "../models/Job.js";
import { JobMatch } from "../models/JobMatch.js";
import { FINISHED_STATUSES, JobRun } from "../models/JobRun.js";
import { ProviderCache } from "../models/ProviderCache.js";
import { compare, skillsIn } from "./compare.service.js";
import { getSearchProfile } from "./searchProfile.js";
import { enabledProviders } from "./jobProviders/index.js";

// Finds openings that fit an analysis's resume and scores each one:
//   profiling → searching → scoring → done | partial | failed
// Every step is recorded on the run, so running it again resumes where it
// stopped: the profile and the chosen jobs are kept, and scored jobs are skipped.
//
// One worker per run: a worker claims the run with a lease (lockedUntil) and
// renews it with every write. If the worker dies, the lease runs out and the
// cron sweep hands the run to a new worker, up to MAX_ATTEMPTS times.

// Fewer jobs than this after a search → broaden it and search again.
const MIN_CANDIDATES = 10;
const MAX_BROADEN = 2;
// OpenAI calls in flight at once while scoring.
const SCORE_CONCURRENCY = 4;
const ANONYMOUS_RUN_TTL_MS = 24 * 60 * 60 * 1000;
// Longer than the slowest single step (an OpenAI call times out at 45 s).
const LEASE_MS = 2 * 60 * 1000;
const MAX_ATTEMPTS = 3;
// A run nobody has claimed this long after it was created was never started.
const UNCLAIMED_MS = 60 * 1000;
const SWEEP_BATCH = 5;

const UNFINISHED = { $nin: [...FINISHED_STATUSES] };

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// The token lets an anonymous user read their run; only its hash is stored.
export async function createRun(analysis, { clientKey, filters = {}, trigger = "analysis" } = {}) {
  const token = crypto.randomBytes(32).toString("hex");
  const previousRun = analysis.user ? await JobRun.findOne({ user: analysis.user }).sort({ createdAt: -1 }).select("_id") : null;
  const run = await JobRun.create({
    analysis: analysis._id,
    user: analysis.user,
    tokenHash: hashToken(token),
    clientKey,
    filters,
    trigger,
    previousRun: previousRun?._id,
    expiresAt: analysis.user ? undefined : new Date(Date.now() + ANONYMOUS_RUN_TTL_MS),
  });
  return { run, token };
}

// Works on the run after the response is sent. On Vercel, waitUntil keeps the
// function alive for it, up to the function's time limit; the cron sweep
// resumes anything cut off. Elsewhere the promise just keeps running.
export function runInBackground(runId) {
  waitUntil(runJob(runId).catch((err) => console.error(`Job run ${runId}: ${err.message}`)));
}

// Picks up runs whose worker died or never started. Called by the cron route.
export async function resumeStalledRuns() {
  const now = Date.now();
  const stalled = await JobRun.find({
    status: UNFINISHED,
    $or: [{ lockedUntil: { $lt: new Date(now) } }, { lockedUntil: null, createdAt: { $lt: new Date(now - UNCLAIMED_MS) } }],
  })
    .sort({ createdAt: 1 })
    .limit(SWEEP_BATCH)
    .select("_id");
  const ids = stalled.map((r) => r.id);
  ids.forEach(runInBackground);
  return ids;
}

// Thrown when a write finds the run cancelled: the worker stops quietly.
class RunStopped extends Error {}

const lease = () => new Date(Date.now() + LEASE_MS);

// Every write while working renews the lease, and none lands on a cancelled run.
async function save(runId, set = {}, inc) {
  const run = await JobRun.findOneAndUpdate(
    { _id: runId, status: { $ne: "cancelled" } },
    { $set: { ...set, lockedUntil: lease() }, ...(inc && { $inc: inc }) },
    { returnDocument: "after" }
  );
  if (!run) throw new RunStopped();
  return run;
}

// The last write: the outcome, and the lease let go.
async function finish(runId, set) {
  const run = await JobRun.findOneAndUpdate(
    { _id: runId, status: { $ne: "cancelled" } },
    { $set: { ...set, finishedAt: new Date(), lockedUntil: null } },
    { returnDocument: "after" }
  );
  if (!run) return JobRun.findById(runId);
  logFinished(run);
  return run;
}

// One structured line per finished run: what it cost and how the sources did.
function logFinished(run) {
  console.log(
    JSON.stringify({
      event: "job_run_finished",
      runId: run.id,
      status: run.status,
      trigger: run.trigger,
      attempts: run.attempts,
      durationMs: run.startedAt ? run.finishedAt - run.startedAt : undefined,
      found: run.progress.found,
      target: run.progress.target,
      scored: run.progress.scored,
      skipped: run.progress.skipped,
      openaiCalls: run.stats.openaiCalls,
      providers: run.stats.providers,
      error: run.error,
    })
  );
}

// Returns the run if this worker now holds it, or null if it's finished or another worker holds it.
function claimRun(runId) {
  const now = new Date();
  return JobRun.findOneAndUpdate(
    { _id: runId, status: UNFINISHED, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
    // $min keeps the first attempt's start time.
    { $set: { lockedUntil: lease() }, $min: { startedAt: now }, $inc: { attempts: 1 } },
    { returnDocument: "after" }
  );
}

export async function runJob(runId) {
  let run = await claimRun(runId);
  if (!run) return JobRun.findById(runId);
  if (run.attempts > MAX_ATTEMPTS) return finish(run._id, { status: "failed", error: `gave up after ${MAX_ATTEMPTS} attempts` });

  try {
    const analysis = await Analysis.findById(run.analysis);
    if (!analysis) throw new Error("the analysis no longer exists");

    if (!run.searchProfile?.titles?.length) {
      await save(run._id, { status: "profiling" });
      // Only a profile built now (not the analysis's cached one) costs a call.
      const built = !analysis.searchProfile?.titles?.length && config.openaiApiKey;
      run = await save(run._id, { searchProfile: await getSearchProfile(analysis) }, built ? { "stats.openaiCalls": 1 } : undefined);
    }
    if (!run.candidates.length) {
      await save(run._id, { status: "searching" });
      run = await search(run, analysis.resumeText);
    }
    run = await save(run._id, { status: "scoring" });
    await score(run, analysis.resumeText);

    return await finish(run._id, { status: run.sourceErrors.length ? "partial" : "done" });
  } catch (err) {
    if (err instanceof RunStopped) return JobRun.findById(runId);
    console.error(`Job run ${runId} failed: ${err.message}`);
    return finish(runId, { status: "failed", error: err.message });
  }
}

// Search every provider, broadening when too few jobs come back, then keep
// the best keyword matches as the run's candidates.
async function search(run, resumeText) {
  const providers = enabledProviders();
  if (!providers.length) throw new Error("no job providers are set up; set JOB_PROVIDERS and the provider's keys");

  // The user's filters win over what the resume suggested.
  const { location, remoteOnly } = run.filters ?? {};
  const profile = { ...run.searchProfile.toObject(), ...(location && { location }), remoteOnly: Boolean(remoteOnly) };
  const found = new Map(); // dedupeHash → Job, so an opening listed twice counts once
  const sourceErrors = new Map();
  const providerStats = [];
  let level = 0;

  for (; level <= MAX_BROADEN; level++) {
    const query = broaden(profile, level, { keepLocation: Boolean(location) });
    const results = await Promise.allSettled(providers.map((p) => searchProvider(p, query)));
    for (const [i, result] of results.entries()) {
      const source = providers[i].name;
      if (result.status === "rejected") {
        sourceErrors.set(source, result.reason.message);
        providerStats.push({ source, level, ms: result.reason.ms, jobs: 0, cached: false, error: result.reason.message });
        continue;
      }
      const { jobs, ms, cached } = result.value;
      providerStats.push({ source, level, ms, jobs: jobs.length, cached });
      for (const job of await saveJobs(jobs)) {
        if (remoteOnly && !job.remote) continue;
        if (!found.has(job.dedupeHash)) found.set(job.dedupeHash, job);
      }
    }
    await save(run._id, { "progress.found": found.size });
    // Every source failing won't be fixed by a broader search.
    if (results.every((r) => r.status === "rejected")) break;
    if (found.size >= MIN_CANDIDATES) break;
  }

  if (!found.size && sourceErrors.size === providers.length) {
    throw new Error(`every job source failed: ${[...sourceErrors].map(([s, m]) => `${s} (${m})`).join(", ")}`);
  }

  const candidates = prefilter([...found.values()], skillsIn(resumeText), config.jobAgentMaxScored);
  return save(run._id, {
    candidates: candidates.map((job) => job._id),
    broadenLevel: Math.min(level, MAX_BROADEN),
    sourceErrors: [...sourceErrors].map(([source, message]) => ({ source, message })),
    "stats.providers": providerStats,
    "progress.found": found.size,
    "progress.target": candidates.length,
  });
}

// One provider search, from the cache when the same query ran recently.
// Resolves to { jobs, ms, cached }; a failure carries `ms` too.
async function searchProvider(provider, query) {
  const started = Date.now();
  const { titles, seniority, location, remoteOnly } = query;
  const key = `${provider.name}:${crypto.createHash("sha1").update(JSON.stringify({ titles, seniority, location, remoteOnly })).digest("hex")}`;
  try {
    if (provider.cacheTtlMs) {
      const hit = await ProviderCache.findOne({ key, expiresAt: { $gt: new Date() } });
      if (hit) return { jobs: hit.jobs.map(reviveDates), ms: Date.now() - started, cached: true };
    }
    const jobs = await provider.search(query);
    if (provider.cacheTtlMs) {
      await ProviderCache.updateOne({ key }, { $set: { jobs, expiresAt: new Date(Date.now() + provider.cacheTtlMs) } }, { upsert: true });
    }
    return { jobs, ms: Date.now() - started, cached: false };
  } catch (err) {
    err.ms = Date.now() - started;
    throw err;
  }
}

const reviveDates = (job) => ({ ...job, postedAt: job.postedAt ? new Date(job.postedAt) : undefined });

// Level 1 drops the seniority word; level 2 drops the location too (country-wide),
// unless the user chose that location themselves.
export function broaden(profile, level, { keepLocation = false } = {}) {
  return {
    ...profile,
    seniority: level >= 1 ? "unknown" : profile.seniority,
    location: level >= 2 && !keepLocation ? "" : profile.location,
  };
}

async function saveJobs(jobs) {
  if (!jobs.length) return [];
  const fetchedAt = new Date();
  await Job.bulkWrite(
    jobs.map((job) => ({
      updateOne: {
        filter: { source: job.source, externalId: job.externalId },
        // Leave out missing fields (salary, postedAt) rather than writing nulls.
        update: { $set: { ...withoutUndefined(job), dedupeHash: dedupeHash(job), fetchedAt } },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  return Job.find({ source: jobs[0].source, externalId: { $in: jobs.map((j) => j.externalId) } });
}

const withoutUndefined = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

const normalizeKey = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Same title, company and location → same opening, whichever source listed it.
export function dedupeHash({ title, company, location }) {
  const key = [title, company, location].map(normalizeKey).join("|");
  return crypto.createHash("sha1").update(key).digest("hex");
}

// Cheap keyword ranking before the (possibly paid) scoring step: most of the
// job's skills found on the resume first, then the highest share, then newest.
// Jobs whose text names no known skills go last but stay eligible, since
// OpenAI can still score them.
export function prefilter(jobs, resumeSkills, limit) {
  const have = new Set(resumeSkills);
  return jobs
    .map((job) => {
      const wanted = skillsIn(`${job.title} ${job.description}`);
      const matched = wanted.filter((s) => have.has(s)).length;
      return { job, matched, share: wanted.length ? matched / wanted.length : -1 };
    })
    .sort((a, b) => b.matched - a.matched || b.share - a.share || (b.job.postedAt ?? 0) - (a.job.postedAt ?? 0))
    .slice(0, limit)
    .map((r) => r.job);
}

async function score(run, resumeText) {
  const scored = new Set((await JobMatch.find({ run: run._id }).distinct("job")).map(String));
  const todo = await Job.find({ _id: { $in: run.candidates.filter((id) => !scored.has(String(id))) } });
  // A resumed run recounts from what is actually saved; skipped jobs get another try.
  await save(run._id, { "progress.scored": scored.size, "progress.skipped": 0 });
  // Jobs in the user's previous run, so the rest can be marked new.
  const seenBefore = run.previousRun ? new Set((await JobMatch.find({ run: run.previousRun }).distinct("job")).map(String)) : null;

  await mapLimit(todo, SCORE_CONCURRENCY, async (job) => {
    let counted = "progress.scored";
    try {
      const result = await compare(resumeText, job.description || job.title);
      await JobMatch.create({
        run: run._id,
        job: job._id,
        ...result,
        newSinceLastRun: seenBefore ? !seenBefore.has(String(job._id)) : false,
      });
    } catch (err) {
      if (err.code === 11000) return; // already scored by an earlier attempt
      // e.g. no OpenAI key and the posting names no skills the keyword engine knows.
      console.warn(`Job run ${run.id}: skipped job ${job.id} (${err.message})`);
      counted = "progress.skipped";
    }
    // With a key, compare() tries OpenAI first, so every job costs a call.
    // Throws RunStopped once the run is cancelled, which stops every worker.
    await save(run._id, {}, { [counted]: 1, ...(config.openaiApiKey && { "stats.openaiCalls": 1 }) });
  });
}

// Runs fn over items, `limit` at a time. The first error stops the rest.
async function mapLimit(items, limit, fn) {
  let next = 0;
  let stopped = false;
  const worker = async () => {
    while (next < items.length && !stopped) {
      try {
        await fn(items[next++]);
      } catch (err) {
        stopped = true;
        throw err;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
