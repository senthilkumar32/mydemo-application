import mongoose from "mongoose";

// One job scored against the resume, within one run.
const jobMatchSchema = new mongoose.Schema(
  {
    run: { type: mongoose.Schema.Types.ObjectId, ref: "JobRun", required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    present: [String],
    missing: [String],
    engine: { type: String, required: true },
    // Not in the user's previous run. Always false for a user's first run and for anonymous runs.
    // (Not named isNew: Mongoose reserves that name on documents.)
    newSinceLastRun: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// A retried run never scores the same job twice.
jobMatchSchema.index({ run: 1, job: 1 }, { unique: true });
jobMatchSchema.index({ run: 1, score: -1 });
// The panel asks for matches added since its last poll, using the last _id it saw.
jobMatchSchema.index({ run: 1, _id: 1 });

// Expects `job` to be populated.
jobMatchSchema.methods.toPublic = function () {
  return {
    id: this.id,
    score: this.score,
    present: this.present,
    missing: this.missing,
    engine: this.engine,
    isNew: this.newSinceLastRun,
    job: this.job.toPublic(),
  };
};

export const JobMatch = mongoose.model("JobMatch", jobMatchSchema);
