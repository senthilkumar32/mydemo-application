import mongoose from "mongoose";

// One resume-vs-JD comparison. The extracted text is kept so the AI step
// (added later) can re-run on past analyses without another upload.
const analysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    fileName: { type: String, required: true },
    resumeText: { type: String, required: true },
    jobDescription: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    present: [String],
    missing: [String],
    // Which comparison produced this result, e.g. "keyword-v1" now, an AI model later.
    engine: { type: String, required: true },
  },
  { timestamps: true }
);

analysisSchema.methods.toPublic = function () {
  return {
    id: this.id,
    fileName: this.fileName,
    score: this.score,
    present: this.present,
    missing: this.missing,
    engine: this.engine,
    createdAt: this.createdAt,
  };
};

export const Analysis = mongoose.model("Analysis", analysisSchema);
