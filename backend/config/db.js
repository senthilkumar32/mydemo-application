import mongoose from "mongoose";
import { config } from "./index.js";

let connecting = null;
// The last connection failure, shown by /api/health.
export let dbError = null;

// Connects once and reuses the connection. A failed attempt is retried on the
// next call, so a fixed setting or Atlas allow-list takes effect without a redeploy.
export function connectDB() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  connecting ??= mongoose
    .connect(config.mongoUri, { dbName: config.mongoDbName, serverSelectionTimeoutMS: 8000 })
    .then(() => {
      dbError = null;
      console.log(`Connected to MongoDB (database: ${mongoose.connection.name})`);
    })
    .catch((err) => {
      dbError = err.message;
      connecting = null;
      throw err;
    });
  return connecting;
}
