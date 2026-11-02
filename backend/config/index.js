// All settings come from the environment (see .env.example).
// Missing required settings are listed rather than thrown, so on Vercel the API
// still starts and /api/health can say what's missing.
export const missingEnv = ["MONGODB_URI", "JWT_SECRET"].filter((name) => !process.env[name]);

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || "",
  // Used when the URI doesn't name a database (Atlas URIs often don't).
  mongoDbName: process.env.MONGODB_DB || "profile-analyzer",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  // Comma-separated list of origins allowed to call the API from a browser.
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173").split(",").map((s) => s.trim()),
  // Optional. Without a key, resumes are scored by keyword matching instead of AI.
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o",
  // Job matching: which sources the agent searches (comma-separated) and their keys.
  jobProviders: (process.env.JOB_PROVIDERS || "adzuna,remotive").split(",").map((s) => s.trim()).filter(Boolean),
  adzunaAppId: process.env.ADZUNA_APP_ID || "",
  adzunaAppKey: process.env.ADZUNA_APP_KEY || "",
  // Adzuna searches one country per request, by its two-letter code (us, gb, in, ...).
  adzunaCountry: (process.env.ADZUNA_COUNTRY || "us").toLowerCase(),
  // The most jobs one run scores against the resume; each can be an OpenAI call.
  jobAgentMaxScored: Number(process.env.JOB_AGENT_MAX_SCORED) || 25,
  // Job searches one user (or one IP, when signed out) can start in 24 hours.
  jobRunsPerDay: Number(process.env.JOB_RUNS_PER_DAY) || 10,
  // Vercel Cron sends this as a Bearer token; the cron route rejects anything else.
  cronSecret: process.env.CRON_SECRET || "",
};
