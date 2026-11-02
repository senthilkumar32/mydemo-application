import mongoose from "mongoose";

// One provider's normalised results for one query, kept for a few hours so
// retries and daily refreshes don't call the provider again.
const providerCacheSchema = new mongoose.Schema({
  // "<provider>:<hash of the query>"
  key: { type: String, required: true, unique: true },
  jobs: { type: [mongoose.Schema.Types.Mixed], default: [] },
  expiresAt: { type: Date, required: true },
});

// MongoDB removes expired entries within about a minute; reads also check expiresAt.
providerCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ProviderCache = mongoose.model("ProviderCache", providerCacheSchema);
