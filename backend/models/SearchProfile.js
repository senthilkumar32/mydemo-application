import mongoose from "mongoose";

// What the job-match agent searches for, built once from a resume.
// Stored on the analysis (as a cache) and on each job run (as the run's input).
export const searchProfileSchema = new mongoose.Schema(
  {
    titles: [String],
    seniority: { type: String, enum: ["intern", "junior", "mid", "senior", "lead", "unknown"] },
    skills: [String],
    location: String,
    remote: Boolean,
    // Which step produced it, e.g. "openai:gpt-4o" or "keyword-v1".
    engine: String,
  },
  { _id: false }
);
