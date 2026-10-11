import * as authService from "../service/auth.service.js";
import { EMAIL_PATTERN, HttpError, cleanString } from "../utils.js";

export async function signUp(req, res) {
  const name = cleanString(req.body.name);
  const email = cleanString(req.body.email).toLowerCase();
  const password = String(req.body.password ?? "");

  if (!name) throw new HttpError(400, "Enter your name.", "name");
  if (!EMAIL_PATTERN.test(email)) throw new HttpError(400, "Enter an email like you@example.com.", "email");
  if (password.length < 8) throw new HttpError(400, "Use at least 8 characters.", "password");

  res.status(201).json(await authService.signUp({ name, email, password }));
}

export async function signIn(req, res) {
  const email = cleanString(req.body.email).toLowerCase();
  const password = String(req.body.password ?? "");
  res.json(await authService.signIn({ email, password }));
}

export async function me(req, res) {
  res.json({ user: await authService.getUser(req.userId) });
}
