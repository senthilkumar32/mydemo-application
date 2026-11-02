import { test } from "node:test";
import assert from "node:assert/strict";
import { clientKey, sameSecret } from "../utils.js";

const request = ({ userId, ip, realIp } = {}) => ({ userId, ip, get: (name) => (name === "x-real-ip" ? realIp : undefined) });

test("clientKey counts signed-in users by id and others by hashed IP", () => {
  assert.equal(clientKey(request({ userId: "u1", ip: "1.2.3.4" })), "user:u1");
  const key = clientKey(request({ ip: "1.2.3.4" }));
  assert.match(key, /^ip:[0-9a-f]{64}$/);
  assert.ok(!key.includes("1.2.3.4"), "the IP itself is not stored");
});

test("clientKey ignores x-real-ip outside Vercel", () => {
  const saved = process.env.VERCEL;
  delete process.env.VERCEL;
  try {
    assert.equal(clientKey(request({ ip: "1.2.3.4", realIp: "9.9.9.9" })), clientKey(request({ ip: "1.2.3.4" })));
  } finally {
    if (saved !== undefined) process.env.VERCEL = saved;
  }
});

test("sameSecret compares any lengths safely", () => {
  assert.equal(sameSecret("abc", "abc"), true);
  assert.equal(sameSecret("abc", "abcd"), false);
  assert.equal(sameSecret("", "abc"), false);
});
