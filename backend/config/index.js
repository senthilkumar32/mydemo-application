// All settings come from the environment (see .env.example).
const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
  return value;
};

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: required("MONGODB_URI"),
  // Used when the URI doesn't name a database (Atlas URIs often don't).
  mongoDbName: process.env.MONGODB_DB || "profile-analyzer",
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  // Comma-separated list of origins allowed to call the API from a browser.
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173").split(",").map((s) => s.trim()),
};
