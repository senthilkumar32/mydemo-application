import { test } from "node:test";
import assert from "node:assert/strict";
import { fallbackProfile } from "../service/searchProfile.js";

test("fallback profile takes the first titled role and the hard skills", () => {
  const resume =
    "Jane Doe Austin, TX Experience Senior Frontend Developer, Acme 2022-now Built React and TypeScript apps on Node.js. " +
    "Software Engineer, Globex 2018-2022 Python services. Strong communication and leadership.";
  const profile = fallbackProfile(resume);
  assert.deepEqual(profile.titles, ["Frontend Developer"]);
  assert.equal(profile.seniority, "senior");
  assert.ok(profile.skills.includes("React"));
  assert.ok(profile.skills.includes("TypeScript"));
  assert.ok(!profile.skills.includes("Communication"), "soft skills are left out");
  assert.equal(profile.engine, "keyword-v1");
});

test("fallback profile prefers a titled role over a bare one", () => {
  const profile = fallbackProfile("Worked with the developer community. Jr. Data Scientist at Initech using Python.");
  assert.deepEqual(profile.titles, ["Data Scientist"]);
  assert.equal(profile.seniority, "junior");
});

test("fallback profile without a role uses the top skill, then a default", () => {
  assert.deepEqual(fallbackProfile("Five years of Python and Docker.").titles, ["Python Developer"]);
  assert.deepEqual(fallbackProfile("Nothing useful here at all.").titles, ["Software Engineer"]);
});
