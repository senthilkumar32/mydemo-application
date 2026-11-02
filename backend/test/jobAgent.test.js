import { test } from "node:test";
import assert from "node:assert/strict";
import { broaden, dedupeHash, hashToken, prefilter } from "../service/jobAgent.js";

test("dedupeHash matches the same opening across sources", () => {
  const a = dedupeHash({ title: "Senior React Developer", company: "Acme Corp", location: "Austin, TX" });
  const b = dedupeHash({ title: "senior react developer ", company: "ACME CORP", location: "Austin TX" });
  const c = dedupeHash({ title: "Senior React Developer", company: "Globex", location: "Austin, TX" });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("prefilter ranks by skills matched, then share, then newest, and caps the list", () => {
  const job = (id, description, postedAt) => ({ id, title: "Developer", description, postedAt: new Date(postedAt) });
  const jobs = [
    job("none", "Great culture and snacks.", "2026-10-31"),
    job("one-of-one", "React.", "2026-10-01"),
    job("two-of-three", "React, TypeScript and Kubernetes.", "2026-10-01"),
    job("two-of-two-old", "React and TypeScript.", "2026-09-01"),
    job("two-of-two-new", "React and TypeScript.", "2026-10-15"),
  ];
  const ranked = prefilter(jobs, ["React", "TypeScript", "Node.js"], 4).map((j) => j.id);
  assert.deepEqual(ranked, ["two-of-two-new", "two-of-two-old", "two-of-three", "one-of-one"]);
});

test("prefilter keeps jobs with no known skills, last", () => {
  const jobs = [{ id: "none", title: "Developer", description: "Snacks." }, { id: "react", title: "Developer", description: "React." }];
  assert.deepEqual(prefilter(jobs, ["Python"], 10).map((j) => j.id), ["react", "none"]);
});

test("broaden drops seniority, then location", () => {
  const profile = { titles: ["Frontend Developer"], seniority: "senior", location: "Austin", remote: false };
  assert.deepEqual(broaden(profile, 0), profile);
  assert.equal(broaden(profile, 1).seniority, "unknown");
  assert.equal(broaden(profile, 1).location, "Austin");
  assert.equal(broaden(profile, 2).location, "");
});

test("broaden keeps a location the user chose", () => {
  const profile = { titles: ["Frontend Developer"], seniority: "senior", location: "Austin", remote: false };
  assert.equal(broaden(profile, 2, { keepLocation: true }).location, "Austin");
});

test("run tokens are stored as a hash", () => {
  const token = "a".repeat(64);
  assert.match(hashToken(token), /^[0-9a-f]{64}$/);
  assert.notEqual(hashToken(token), token);
  assert.equal(hashToken(token), hashToken(token));
});
