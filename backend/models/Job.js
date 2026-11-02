import mongoose from "mongoose";

// One opening from a job source, shared by every run that finds it.
const jobSchema = new mongoose.Schema({
  source: { type: String, required: true },
  externalId: { type: String, required: true },
  title: { type: String, required: true },
  company: String,
  location: String,
  remote: { type: Boolean, default: false },
  salary: { min: Number, max: Number },
  url: { type: String, required: true },
  // Plain text: HTML stripped and cut to length when fetched.
  description: { type: String, default: "" },
  postedAt: Date,
  fetchedAt: { type: Date, default: Date.now },
  // The same opening listed by two sources has the same hash (title + company + location).
  dedupeHash: { type: String, required: true, index: true },
});

jobSchema.index({ source: 1, externalId: 1 }, { unique: true });
// Openings go stale; drop any not fetched again within 30 days.
jobSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

jobSchema.methods.toPublic = function () {
  return {
    id: this.id,
    source: this.source,
    title: this.title,
    company: this.company,
    location: this.location,
    remote: this.remote,
    salary: this.salary?.min || this.salary?.max ? this.salary : undefined,
    url: this.url,
    postedAt: this.postedAt,
  };
};

export const Job = mongoose.model("Job", jobSchema);
