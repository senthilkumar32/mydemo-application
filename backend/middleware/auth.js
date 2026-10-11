import { verifyToken } from "../service/auth.service.js";
import { HttpError } from "../utils.js";

function userIdFrom(req) {
  const [scheme, token] = (req.get("authorization") || "").split(" ");
  return scheme === "Bearer" && token ? verifyToken(token) : null;
}

// Sets req.userId when a valid token is sent; lets the request through either way.
export function optionalAuth(req, res, next) {
  req.userId = userIdFrom(req);
  next();
}

export function requireAuth(req, res, next) {
  req.userId = userIdFrom(req);
  if (!req.userId) throw new HttpError(401, "Your session has ended. Sign in again.");
  next();
}
