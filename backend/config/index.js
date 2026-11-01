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
};
