import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

// The shape the frontend sees. Never includes the password hash.
userSchema.methods.toPublic = function () {
  return { id: this.id, name: this.name, email: this.email };
};

export const User = mongoose.model("User", userSchema);
