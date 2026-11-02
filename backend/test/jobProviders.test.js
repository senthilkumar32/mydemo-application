import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalize } from "../service/jobProviders/adzuna.js";
import { normalize as normalizeRemotive } from "../service/jobProviders/remotive.js";
import { cleanText } from "../service/jobProviders/shared.js";
import { dedupeHash } from "../service/jobAgent.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/adzuna-search.json", import.meta.url)));

test("adzuna results normalise to the Job shape", () => {
  const jobs = fixture.results.map(normalize).filter(Boolean);
  assert.equal(jobs.length, 2, "the listing without a URL is dropped");

  const [react, data] = jobs;
  assert.deepEqual(react, {
    source: "adzuna",
    externalId: "4815162342",
    title: "Senior React Developer",
    company: "Acme Corp",
    location: "Austin, Travis County",
    remote: true,
    salary: { min: 120000, max: 150000 },
    url: "https://www.adzuna.com/details/4815162342",
    description: "We are hiring a React developer with TypeScript & Node.js experience. Remote friendly team.",
    postedAt: new Date("2026-10-28T09:15:00Z"),
  });
  assert.equal(data.externalId, "1234567", "numeric ids become strings");
  assert.equal(data.remote, false);
  assert.equal(data.salary, undefined);
});

test("remotive results normalise to the Job shape, all remote", () => {
  const remotive = JSON.parse(readFileSync(new URL("./fixtures/remotive-search.json", import.meta.url)));
  const [react, data] = remotive.jobs.map(normalizeRemotive);
  assert.equal(react.source, "remotive");
  assert.equal(react.externalId, "1900001");
  assert.equal(react.description, "Join us to build React apps in TypeScript.");
  assert.equal(react.location, "USA Only");
  assert.equal(react.remote, true);
  assert.equal(data.location, "Remote", "an empty location reads as Remote");
});

test("the same opening from two sources gets the same dedupe hash", () => {
  const remotive = JSON.parse(readFileSync(new URL("./fixtures/remotive-search.json", import.meta.url)));
  const fromAdzuna = normalize({ ...fixture.results[0], location: { display_name: "USA Only" } });
  const fromRemotive = normalizeRemotive(remotive.jobs[0]);
  assert.equal(dedupeHash(fromAdzuna), dedupeHash(fromRemotive));
});

test("cleanText strips tags, decodes entities, collapses space and cuts to length", () => {
  assert.equal(cleanText("<p>Hello&nbsp;<b>world</b></p>\n\n &lt;script&gt;"), "Hello world <script>");
  assert.equal(cleanText("abcdef", 3), "abc");
  assert.equal(cleanText(undefined), "");
});
