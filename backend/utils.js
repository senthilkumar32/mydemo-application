import crypto from "node:crypto";

// An error that is safe to show the user. `field` names the form input it belongs to.
export class HttpError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Turn an untrusted request value into a trimmed string ("" when missing).
export const cleanString = (value) => String(value ?? "").trim();

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

// Who a rate limit counts against: the signed-in user, or a hash of the caller's IP.
// On Vercel the platform sets x-real-ip; anywhere else the socket address is used,
// because a client could send that header itself.
export function clientKey(req) {
  if (req.userId) return `user:${req.userId}`;
  const ip = (process.env.VERCEL && req.get("x-real-ip")) || req.ip || "unknown";
  return `ip:${sha256(ip)}`;
}

// Compares two secrets in constant time.
export const sameSecret = (a, b) => crypto.timingSafeEqual(Buffer.from(sha256(String(a))), Buffer.from(sha256(String(b))));
