import mongoose from "mongoose";
import { searchProfileSchema } from "./SearchProfile.js";

export const RUN_STATUSES = ["queued", "profiling", "searching", "scoring", "done", "partial", "failed", "cancelled"];
export const FINISHED_STATUSES = new Set(["done", "partial", "failed", "cancelled"]);

// One search for jobs that fit an analysis's resume. The agent records each
// step here, so a retried run picks up where it stopped.
const jobRunSchema = new mongoose.Schema(
  {
    analysis: { type: mongoose.Schema.Types.ObjectId, ref: "Analysis", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Lets an anonymous user read their own run. Only the hash is stored.
    tokenHash: String,
    // Who the daily run limit counts against: "user:<id>" or "ip:<hash>".
    clientKey: String,
    // Set by the user when starting a run; override the search profile.
    filters: { location: String, remoteOnly: Boolean },
    // What started it: a new analysis, the user asking again, or the daily refresh.
    trigger: { type: String, enum: ["analysis", "retry", "refresh"], default: "analysis" },
    // The user's run before this one; jobs not found there are marked new.
    previousRun: { type: mongoose.Schema.Types.ObjectId, ref: "JobRun" },
    status: { type: String, enum: RUN_STATUSES, default: "queued" },
    searchProfile: searchProfileSchema,
    // 0 = as profiled, 1 = seniority dropped, 2 = location dropped too.
    broadenLevel: { type: Number, default: 0 },
    // The jobs chosen for scoring, best keyword match first.
    candidates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
    progress: {
      found: { type: Number, default: 0 },
      target: { type: Number, default: 0 },
      scored: { type: Number, default: 0 },
      // Jobs that couldn't be scored, e.g. no recognisable skills and no OpenAI key.
      skipped: { type: Number, default: 0 },
    },
    // Sources that failed; the run carries on with the others.
    sourceErrors: [{ _id: false, source: String, message: String }],
    // For cost and reliability tracking; also logged when the run finishes.
    stats: {
      // OpenAI requests attempted (profile + scoring), including ones that fell back.
      openaiCalls: { type: Number, default: 0 },
      // One entry per provider search: how long it took and what it returned.
      providers: [{ _id: false, source: String, level: Number, ms: Number, jobs: Number, cached: Boolean, error: String }],
    },
    attempts: { type: Number, default: 0 },
    lockedUntil: Date,
    error: String,
    startedAt: Date,
    finishedAt: Date,
    // Set only for anonymous runs, which are deleted at this time.
    expiresAt: Date,
  },
  { timestamps: true }
);

jobRunSchema.index({ user: 1, createdAt: -1 });
jobRunSchema.index({ status: 1, lockedUntil: 1 });
jobRunSchema.index({ clientKey: 1, createdAt: -1 });
jobRunSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

jobRunSchema.methods.toPublic = function () {
  return {
    id: this.id,
    analysisId: String(this.analysis),
    status: this.status,
    progress: {
      found: this.progress.found,
      target: this.progress.target,
      scored: this.progress.scored,
    },
    failedSources: this.sourceErrors.map((e) => e.source),
    startedAt: this.startedAt,
    finishedAt: this.finishedAt,
  };
};

export const JobRun = mongoose.model("JobRun", jobRunSchema);
