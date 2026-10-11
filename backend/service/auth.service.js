import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { User } from "../models/User.js";
import { HttpError } from "../utils.js";

const signToken = (user) => jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

const session = (user) => ({ token: signToken(user), user: user.toPublic() });

// Returns the user id in a valid token, or null.
export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret).sub;
  } catch {
    return null;
  }
}

export async function signUp({ name, email, password }) {
  if (await User.exists({ email })) {
    throw new HttpError(409, "An account with this email already exists. Sign in instead.", "email");
  }
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  return session(user);
}

export async function signIn({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new HttpError(401, "No account uses this email. Check the spelling or create an account.", "email");
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "That password doesn't match this email.", "password");
  }
  return session(user);
}

export async function getUser(id) {
  const user = await User.findById(id);
  if (!user) throw new HttpError(401, "Your session has ended. Sign in again.");
  return user.toPublic();
}
