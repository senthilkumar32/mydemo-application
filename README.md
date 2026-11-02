# Profile Analyzer

Upload a resume PDF, paste a job description, and get a score out of 100 with the skills you have and the ones you're missing. While you read your score, a background search lists live job openings that fit the resume.

```
frontend/                React + Vite app
backend/                 Express API + MongoDB (Mongoose)
  server.js              App setup and startup
  utils.js               Shared helpers (HttpError, validation, rate-limit key)
  config/                Environment settings and the MongoDB connection
  routes/                URL -> middleware -> controller wiring
  controller/            Reads the request, validates input, sends the response
  service/               Business logic: auth, PDF text extraction, resume vs. JD comparison,
                         the job-match agent (jobAgent.js) and job sources (jobProviders/)
  middleware/            Auth (JWT), PDF upload, error handling
  models/                Mongoose schemas (User, Analysis, JobRun, Job, JobMatch, ProviderCache)
  scripts/               runJobAgent.js: run the job-match agent from the terminal
  test/                  node:test unit tests, plus an end-to-end suite
```

## Run it locally

You need Node.js 22.9 or newer and a MongoDB database (local, or a free MongoDB Atlas cluster).

**1. Backend** (http://localhost:5000)

```sh
cd backend
npm install
cp .env.example .env     # then set MONGODB_URI, JWT_SECRET and OPENAI_API_KEY
npm run dev
```

**2. Frontend** (http://localhost:5173)

```sh
cd frontend
npm install
npm run dev
```

In development, Vite forwards every `/api` request to the backend, so no extra setup is needed.

## API

| Method | Path | Auth | What it does |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | none | `{ name, email, password }` → `{ token, user }` |
| POST | `/api/auth/signin` | none | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | Bearer | Current user |
| POST | `/api/analyses` | optional | Multipart: `resume` (PDF, 4 MB max) + `jobDescription` → `{ analysis }`. Saved to the user's history when signed in. |
| GET | `/api/analyses` | Bearer | The user's last 20 analyses |
| PATCH | `/api/auth/me` | Bearer | `{ jobAlerts }` → `{ user }`. Turns the daily job refresh on or off. |
| POST | `/api/job-runs` | optional | `{ analysisId, location?, remoteOnly? }` → `{ jobRun }`. A new job search (retry or new filters). |
| GET | `/api/job-runs/latest` | Bearer | The user's most recent job search, with its matches |
| GET | `/api/job-runs/:id` | Bearer or run token | `{ jobRun, matches, cursor }`. Send `?since=<cursor>` to get only matches added since the last call. |
| POST | `/api/job-runs/:id/cancel` | Bearer or run token | Stops scoring; keeps what was found |
| GET | `/api/cron/job-agent` | `CRON_SECRET` | Vercel Cron: resumes stalled job searches and starts daily refreshes |
| GET | `/api/health` | none | Setup problems, plus job-source status |

`POST /api/analyses` also starts a job search and returns `jobRun: { id, analysisId, status, progress, token? }`, or `jobRun: null` with a `jobRunError` explaining why not. Anonymous users get a `token` and send it back as the `X-Run-Token` header to read or cancel that run.

Errors come back as `{ message, field? }`, where `field` names the form input the message belongs to.

## Job matching

After each analysis, [backend/service/jobAgent.js](backend/service/jobAgent.js) runs in the background (Vercel `waitUntil`) and records every step on a `JobRun`:

1. **Profile:** OpenAI turns the resume into job titles, seniority, skills and location (keyword guess without a key). Cached on the analysis.
2. **Search:** every source in `JOB_PROVIDERS` in parallel, 10 s timeout each. One failing source makes the run `partial`, not failed. Results are cached per query (Adzuna 1 h, Remotive 6 h).
3. **Filter:** the same opening from two sources counts once (title + company + location). Keyword matching keeps the best `JOB_AGENT_MAX_SCORED` (default 25). Fewer than 10 jobs → drop seniority, then location, and search again.
4. **Score:** the same engines as analyses, 4 at a time. Jobs not in the user's previous run are marked new.
5. **Save as it goes:** the panel polls every 3 s and shows matches as they land.

Sources: **Remotive** (remote jobs, no key) and **Adzuna** (needs `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`; returns description snippets, so its scores are rougher). Signed-in users can turn on a daily refresh; the cron starts it.

Limits: `JOB_RUNS_PER_DAY` searches per user, or per IP when signed out (default 10). Each search can make up to `JOB_AGENT_MAX_SCORED` + 1 OpenAI calls. Every finished run logs one `job_run_finished` JSON line with its duration, counts, OpenAI calls and per-source timings.

Try the agent without the app: `cd backend && npm run job-agent` (latest analysis), `npm run job-agent -- <analysisId>`, or `npm run job-agent -- --resume <runId>`.

### Runbook: stuck job searches

A worker holds a run with a 2-minute lease (`lockedUntil`) and renews it on every write. The cron sweep (`/api/cron/job-agent`) restarts runs whose lease ran out, or that nobody claimed within a minute. A run gets 3 attempts, then fails with "gave up after 3 attempts".

- **Is it stuck?** In MongoDB: `db.jobruns.find({ status: { $nin: ["done","partial","failed","cancelled"] }, lockedUntil: { $lt: new Date() } })`.
- **Resume now** instead of waiting for the cron: `curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>/api/cron/job-agent`, or locally `npm run job-agent -- --resume <runId>`.
- **Sources failing?** `GET /api/health` shows each source, whether its keys are set, and its failures in the last 24 hours. The messages are in the `job_run_finished` log lines (`providers[].error`).
- **Runs keep timing out on Vercel?** Check your plan's function time limit against the run's `durationMs`. Lower `JOB_AGENT_MAX_SCORED`, or move the agent to a durable worker.
- **Stop one:** `POST /api/job-runs/<id>/cancel`, or set `status: "cancelled"` on the document. Workers stop at their next write.

## Tests

`cd backend && npm test` runs the unit tests. The end-to-end suite (real API and MongoDB, fake job sources, failure drills) runs only when `TEST_MONGODB_URI` is set. It uses its own database, `profile-analyzer-e2e-test`, and drops it when done:

```sh
TEST_MONGODB_URI="mongodb+srv://..." npm test
```

## AI scoring (OpenAI)

When `OPENAI_API_KEY` is set in `backend/.env`, [backend/service/openai.service.js](backend/service/openai.service.js) sends the resume text and the JD to OpenAI's Chat Completions API. It asks for a JSON reply, `{ score, present, missing }`, enforced by a strict JSON schema. The model picks out the skills the job asks for, treats equivalents as matches (for example "Postgres" for PostgreSQL), weights required skills above nice-to-haves, and ignores soft skills. Set `OPENAI_MODEL` to use a model other than `gpt-4o`.

If there's no key, or OpenAI fails (bad key, used-up quota, rate limit, timeout), [backend/service/compare.service.js](backend/service/compare.service.js) falls back to keyword matching against `skills.js` and logs why. Each analysis records which engine scored it (`openai:<model>` or `keyword-v1`). Analyses also store the resume text and the JD, so past ones can be re-scored without another upload.

The key stays on the server. The browser only ever talks to this API.

## Deploy to Vercel

[vercel.json](vercel.json) deploys both folders as one Vercel project using [services](https://vercel.com/docs/services):

- `frontend` (Vite) is public at `/`.
- `backend` (Express) is public at `/api/*` and receives the full path, for example `/api/analyses`.

Both share one domain, so the browser calls `/api` directly and no CORS setup is needed. In the Vercel project settings, add the variables from `backend/.env.example` (`MONGODB_URI`, `JWT_SECRET`, `OPENAI_API_KEY` and so on). If you use MongoDB Atlas, allow connections from anywhere (`0.0.0.0/0`), because Vercel functions don't have fixed IPs. Resume uploads are capped at 4 MB because Vercel limits request bodies to 4.5 MB.

The `crons` entry in `vercel.json` calls `/api/cron/job-agent` once a day, the most the Hobby plan allows. Set `CRON_SECRET` so only Vercel can call it. On Pro, change the schedule to `*/5 * * * *` so stalled job searches resume within minutes. Crons run only on production deployments.

Run `vercel dev` to try the deployed setup locally. `npm run dev` still works as before.
