import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Opted in to a daily job search on their latest resume.
    jobAlerts: { type: Boolean, default: false },
    // When the daily refresh last started a search for them.
    jobAlertsRunAt: Date,
  },
  { timestamps: true }
);

userSchema.index({ jobAlerts: 1, jobAlertsRunAt: 1 });

// The shape the frontend sees. Never includes the password hash.
userSchema.methods.toPublic = function () {
  return { id: this.id, name: this.name, email: this.email, jobAlerts: this.jobAlerts };
};

export const User = mongoose.model("User", userSchema);
