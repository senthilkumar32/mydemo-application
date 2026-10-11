import mongoose from "mongoose";
import { config } from "./index.js";

export async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri, { dbName: config.mongoDbName });
  } catch (err) {
    console.error(`Couldn't connect to MongoDB: ${err.message}`);
    console.error("Check MONGODB_URI in backend/.env (see .env.example for the format).");
    process.exit(1);
  }
  console.log(`Connected to MongoDB (database: ${mongoose.connection.name})`);
}
