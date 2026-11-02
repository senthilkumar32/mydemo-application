// End-to-end: the real API and agent against a real MongoDB, with fake job
// sources and no OpenAI key (keyword scoring). Also the failure drills:
// a source down, every source down, a cancelled run, a worker that died,
// a lease still held, a run out of attempts.
//
// Runs only when TEST_MONGODB_URI is set. It uses its own database,
// profile-analyzer-e2e-test, and drops it before and after.
//   TEST_MONGODB_URI="mongodb+srv://..." npm test
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

const TEST_URI = process.env.TEST_MONGODB_URI;
const TEST_DB = "profile-analyzer-e2e-test";

describe("job runs end to end", { skip: !TEST_URI && "set TEST_MONGODB_URI to run", timeout: 180000 }, () => {
  let mongoose, app, config, server, base;
  let Analysis, JobRun, JobMatch, createRun, runJob;

  // What each fake source does on its next search.
  const sources = {
    "fake-a": { jobs: [], fail: false, delayMs: 0 },
    "fake-b": { jobs: [], fail: false, delayMs: 0 },
  };

  const job = (source, id, title, company, description) => ({
    source,
    externalId: id,
    title,
    company,
    location: "Austin, TX",
    remote: false,
    url: `https://jobs.example.com/${source}/${id}`,
    description,
    postedAt: new Date("2026-10-30T00:00:00Z"),
  });

  const RESUME = "Jane Doe. Senior Frontend Developer at Acme, 2022 to now. React, TypeScript, Node.js, PostgreSQL and Docker.";

  async function call(method, path, { body, token, runToken } = {}) {
    const headers = {};
    if (body) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    if (runToken) headers["X-Run-Token"] = runToken;
    const res = await fetch(`${base}${path}`, { method, headers, body: body && JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }

  async function waitForRun(id, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const run = await JobRun.findById(id);
      if (["done", "partial", "failed", "cancelled"].includes(run.status) && !run.lockedUntil) return run;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`run ${id} didn't finish in ${timeoutMs} ms`);
  }

  let counter = 0;
  async function signUp() {
    counter += 1;
    const { status, body } = await call("POST", "/api/auth/signup", {
      body: { name: "Test User", email: `e2e-${Date.now()}-${counter}@example.com`, password: "correct horse battery" },
    });
    assert.equal(status, 201);
    return body;
  }

  const makeAnalysis = (user) =>
    Analysis.create({
      user,
      fileName: "resume.pdf",
      resumeText: RESUME,
      jobDescription: "React developer",
      score: 80,
      present: ["React"],
      missing: [],
      engine: "keyword-v1",
    });

  const dropTestDatabase = async () => {
    assert.equal(mongoose.connection.name, TEST_DB, "refusing to drop a database that isn't the test database");
    await mongoose.connection.dropDatabase();
  };

  before(async () => {
    Object.assign(process.env, {
      MONGODB_URI: TEST_URI,
      MONGODB_DB: TEST_DB,
      JWT_SECRET: "e2e-test-secret",
      OPENAI_API_KEY: "",
      JOB_PROVIDERS: "fake-a,fake-b",
      JOB_RUNS_PER_DAY: "100",
      CRON_SECRET: "e2e-cron-secret",
      VERCEL: "1", // export the app without listening on PORT
    });
    mongoose = (await import("mongoose")).default;
    ({ config } = await import("../config/index.js"));
    const { connectDB } = await import("../config/db.js");
    const { registerProvider } = await import("../service/jobProviders/index.js");
    const { ProviderError } = await import("../service/jobProviders/shared.js");
    ({ Analysis } = await import("../models/Analysis.js"));
    ({ JobRun } = await import("../models/JobRun.js"));
    ({ JobMatch } = await import("../models/JobMatch.js"));
    ({ createRun, runJob } = await import("../service/jobAgent.js"));
    app = (await import("../server.js")).default;

    for (const name of Object.keys(sources)) {
      registerProvider({
        name,
        isConfigured: () => true,
        async search() {
          const s = sources[name];
          if (s.delayMs) await new Promise((r) => setTimeout(r, s.delayMs));
          if (s.fail) throw new ProviderError(name, "down for the drill");
          return s.jobs;
        },
      });
    }

    await connectDB();
    await dropTestDatabase();
    // The unique indexes are what stop a resumed run from scoring a job twice.
    await mongoose.syncIndexes();
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    server?.close();
    if (mongoose?.connection.readyState === 1) {
      await dropTestDatabase();
      await mongoose.disconnect();
    }
  });

  const resetSources = () => {
    sources["fake-a"] = {
      fail: false,
      delayMs: 0,
      jobs: [
        job("fake-a", "a1", "Senior React Developer", "Acme Corp", "React and TypeScript with Node.js."),
        job("fake-a", "a2", "Frontend Engineer", "Globex", "React, Vue and Kubernetes."),
        job("fake-a", "a3", "Office Manager", "Initech", "Keep the snacks stocked."),
      ],
    };
    sources["fake-b"] = {
      fail: false,
      delayMs: 0,
      jobs: [
        // The same opening as a1, listed by the other source.
        job("fake-b", "b1", "senior react developer", "ACME CORP", "React and TypeScript."),
        job("fake-b", "b2", "Full Stack Developer", "Umbrella", "Node.js, PostgreSQL and Docker."),
      ],
    };
  };

  test("a signed-in user's run finds, dedupes, scores and pages its matches", async () => {
    resetSources();
    const { token, user } = await signUp();
    const analysis = await makeAnalysis(user.id);

    const started = await call("POST", "/api/job-runs", { token, body: { analysisId: analysis.id } });
    assert.equal(started.status, 201);
    assert.equal(started.body.jobRun.token, undefined, "signed-in users don't get a run token");

    const run = await waitForRun(started.body.jobRun.id);
    assert.equal(run.status, "done");
    assert.equal(run.progress.found, 4, "a1 and b1 are one opening");
    assert.equal(run.progress.scored, 3);
    assert.equal(run.progress.skipped, 1, "the posting with no known skills can't be keyword-scored");
    assert.deepEqual(run.searchProfile.titles, ["Frontend Developer"]);
    assert.equal(run.stats.openaiCalls, 0);
    // Fewer than 10 jobs, so it broadened twice: 2 sources × 3 searches.
    assert.equal(run.broadenLevel, 2);
    assert.equal(run.stats.providers.length, 6);

    const page = await call("GET", `/api/job-runs/${run.id}`, { token });
    assert.equal(page.status, 200);
    assert.equal(page.body.matches.length, 3);
    assert.ok(page.body.matches.every((m) => m.job.title && m.job.url && typeof m.score === "number"));
    assert.ok(page.body.matches.every((m) => m.isNew === false), "nothing is new on a user's first run");

    const next = await call("GET", `/api/job-runs/${run.id}?since=${page.body.cursor}`, { token });
    assert.equal(next.body.matches.length, 0, "the cursor skips matches already seen");

    const latest = await call("GET", "/api/job-runs/latest", { token });
    assert.equal(latest.body.jobRun.id, run.id);

    // A second run marks only the openings not in the first one as new.
    sources["fake-a"].jobs.push(job("fake-a", "a4", "React Native Developer", "Hooli", "React and TypeScript on mobile."));
    const second = await call("POST", "/api/job-runs", { token, body: { analysisId: analysis.id } });
    await waitForRun(second.body.jobRun.id);
    const { body } = await call("GET", `/api/job-runs/${second.body.jobRun.id}`, { token });
    const fresh = body.matches.filter((m) => m.isNew).map((m) => m.job.title);
    assert.deepEqual(fresh, ["React Native Developer"]);
  });

  test("other people's runs and analyses are not found", async () => {
    resetSources();
    const owner = await signUp();
    const stranger = await signUp();
    const analysis = await makeAnalysis(owner.user.id);
    const { run, token: runToken } = await createRun(await makeAnalysis(undefined), { clientKey: "e2e" });

    assert.equal((await call("GET", `/api/job-runs/${run.id}`)).status, 404, "anonymous run without its token");
    assert.equal((await call("GET", `/api/job-runs/${run.id}`, { token: stranger.token })).status, 404);
    assert.equal((await call("GET", `/api/job-runs/${run.id}`, { runToken })).status, 200);
    assert.equal((await call("POST", "/api/job-runs", { token: stranger.token, body: { analysisId: analysis.id } })).status, 404);
    await JobRun.updateOne({ _id: run._id }, { status: "cancelled" });
  });

  test("drill: one source down gives a partial run", async () => {
    resetSources();
    sources["fake-b"].fail = true;
    const { token, user } = await signUp();
    const started = await call("POST", "/api/job-runs", { token, body: { analysisId: (await makeAnalysis(user.id)).id } });
    const run = await waitForRun(started.body.jobRun.id);
    assert.equal(run.status, "partial");
    const { body } = await call("GET", `/api/job-runs/${run.id}`, { token });
    assert.deepEqual(body.jobRun.failedSources, ["fake-b"]);
    assert.ok(body.matches.length > 0);
  });

  test("drill: every source down fails the run", async () => {
    resetSources();
    sources["fake-a"].fail = true;
    sources["fake-b"].fail = true;
    const { token, user } = await signUp();
    const started = await call("POST", "/api/job-runs", { token, body: { analysisId: (await makeAnalysis(user.id)).id } });
    const run = await waitForRun(started.body.jobRun.id);
    assert.equal(run.status, "failed");
    assert.match(run.error, /every job source failed/);
    assert.equal(run.broadenLevel, 0, "no point broadening when every source is down");
  });

  test("drill: a cancelled run stays cancelled and stops scoring", async () => {
    resetSources();
    sources["fake-a"].delayMs = 1500;
    const { token, user } = await signUp();
    const started = await call("POST", "/api/job-runs", { token, body: { analysisId: (await makeAnalysis(user.id)).id } });
    const cancelled = await call("POST", `/api/job-runs/${started.body.jobRun.id}/cancel`, { token });
    assert.equal(cancelled.body.jobRun.status, "cancelled");

    await new Promise((r) => setTimeout(r, 2500));
    const run = await JobRun.findById(started.body.jobRun.id);
    assert.equal(run.status, "cancelled");
    assert.equal(await JobMatch.countDocuments({ run: run._id }), 0);
  });

  test("drill: a run whose worker died is resumed by the cron sweep without rescoring", async () => {
    resetSources();
    const { token, user } = await signUp();
    const analysis = await makeAnalysis(user.id);
    const first = await call("POST", "/api/job-runs", { token, body: { analysisId: analysis.id } });
    const done = await waitForRun(first.body.jobRun.id);

    // A run that got as far as scoring one job, then its function was killed.
    const { run } = await createRun(analysis, { clientKey: `user:${user.id}` });
    const alreadyScored = await JobMatch.findOne({ run: done._id });
    await JobRun.updateOne(
      { _id: run._id },
      {
        status: "scoring",
        attempts: 1,
        lockedUntil: new Date(Date.now() - 1000),
        searchProfile: done.searchProfile,
        candidates: done.candidates,
        "progress.target": done.progress.target,
      }
    );
    await JobMatch.create({ run: run._id, job: alreadyScored.job, score: alreadyScored.score, engine: alreadyScored.engine });

    assert.equal((await call("GET", "/api/cron/job-agent")).status, 401, "cron needs its secret");
    const swept = await fetch(`${base}/api/cron/job-agent`, { headers: { Authorization: `Bearer ${config.cronSecret}` } }).then((r) => r.json());
    assert.ok(swept.resumed.includes(run.id));

    const resumed = await waitForRun(run.id);
    assert.equal(resumed.status, "done");
    assert.equal(resumed.attempts, 2);
    assert.equal(resumed.progress.scored, done.progress.scored);
    assert.equal(await JobMatch.countDocuments({ run: run._id }), done.progress.scored, "no job scored twice");
  });

  test("drill: a live lease is respected and a run out of attempts gives up", async () => {
    const analysis = await makeAnalysis(undefined);

    const { run: held } = await createRun(analysis, { clientKey: "e2e" });
    await JobRun.updateOne({ _id: held._id }, { status: "scoring", attempts: 1, lockedUntil: new Date(Date.now() + 60000) });
    const untouched = await runJob(held.id);
    assert.equal(untouched.attempts, 1);
    assert.equal(untouched.status, "scoring");
    await JobRun.updateOne({ _id: held._id }, { status: "cancelled", lockedUntil: null });

    const { run: tired } = await createRun(analysis, { clientKey: "e2e" });
    await JobRun.updateOne({ _id: tired._id }, { status: "scoring", attempts: 3, lockedUntil: new Date(Date.now() - 1000) });
    const gaveUp = await runJob(tired.id);
    assert.equal(gaveUp.status, "failed");
    assert.match(gaveUp.error, /gave up/);
  });

  test("the daily limit returns 429", async () => {
    resetSources();
    const { token, user } = await signUp();
    const analysis = await makeAnalysis(user.id);
    const saved = config.jobRunsPerDay;
    config.jobRunsPerDay = 1;
    try {
      const first = await call("POST", "/api/job-runs", { token, body: { analysisId: analysis.id } });
      assert.equal(first.status, 201);
      const second = await call("POST", "/api/job-runs", { token, body: { analysisId: analysis.id } });
      assert.equal(second.status, 429);
      await waitForRun(first.body.jobRun.id);
    } finally {
      config.jobRunsPerDay = saved;
    }
  });

  test("users who opt in get a daily refresh from the cron", async () => {
    resetSources();
    const { token, user } = await signUp();
    await makeAnalysis(user.id);
    const patched = await call("PATCH", "/api/auth/me", { token, body: { jobAlerts: true } });
    assert.equal(patched.body.user.jobAlerts, true);

    const swept = await fetch(`${base}/api/cron/job-agent`, { headers: { Authorization: `Bearer ${config.cronSecret}` } }).then((r) => r.json());
    const mine = await JobRun.findOne({ user: user.id, trigger: "refresh" });
    assert.ok(mine && swept.refreshed.includes(mine.id));
    assert.equal((await waitForRun(mine.id)).status, "done");

    const again = await fetch(`${base}/api/cron/job-agent`, { headers: { Authorization: `Bearer ${config.cronSecret}` } }).then((r) => r.json());
    assert.ok(!again.refreshed.includes(mine.id), "at most one refresh a day");
    assert.equal(await JobRun.countDocuments({ user: user.id, trigger: "refresh" }), 1);
  });

  test("health reports the job sources", async () => {
    const { body } = await call("GET", "/api/health");
    assert.equal(body.ok, true);
    assert.deepEqual(
      body.jobMatching.providers.map((p) => [p.name, p.configured]),
      [["fake-a", true], ["fake-b", true]]
    );
    assert.ok(body.jobMatching.providers.find((p) => p.name === "fake-b").failuresLast24h >= 1, "the partial-run drill counted");
    assert.equal(body.jobMatching.cronConfigured, true);
  });
});
