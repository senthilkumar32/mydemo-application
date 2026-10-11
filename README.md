# Profile Analyzer

Upload a resume PDF, paste a job description, and get a score out of 100 with the skills you have and the ones you're missing.

```
frontend/                React + Vite app
backend/                 Express API + MongoDB (Mongoose)
  server.js              App setup and startup
  utils.js               Shared helpers (HttpError, validation)
  config/                Environment settings and the MongoDB connection
  routes/                URL -> middleware -> controller wiring
  controller/            Reads the request, validates input, sends the response
  service/               Business logic: auth, PDF text extraction, resume vs. JD comparison
  middleware/            Auth (JWT), PDF upload, error handling
  models/                Mongoose schemas (User, Analysis)
```

## Run it locally

You need Node.js 22.9 or newer and a MongoDB database (local, or a free MongoDB Atlas cluster).

**1. Backend** (http://localhost:5000)

```sh
cd backend
npm install
cp .env.example .env     # then set MONGODB_URI, JWT_SECRET and COHERE_API_KEY
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

Errors come back as `{ message, field? }`, where `field` names the form input the message belongs to.

## AI scoring (Cohere)

When `COHERE_API_KEY` is set in `backend/.env`, [backend/service/cohere.service.js](backend/service/cohere.service.js) sends the resume text and the JD to Cohere's chat API. It asks for a JSON reply, `{ score, present, missing }`, checked against a schema. The model picks out the skills the job asks for, treats equivalents as matches (for example "Postgres" for PostgreSQL), weights required skills above nice-to-haves, and ignores soft skills. Set `COHERE_MODEL` to use a model other than `command-a-plus-05-2026`.

If there's no key, or Cohere fails (bad key, used-up allowance, rate limit, timeout), [backend/service/compare.service.js](backend/service/compare.service.js) falls back to keyword matching against `skills.js` and logs why. Each analysis records which engine scored it (`cohere:<model>` or `keyword-v1`). Analyses also store the resume text and the JD, so past ones can be re-scored without another upload.

The key stays on the server. The browser only ever talks to this API.

## Deploy to Vercel

[vercel.json](vercel.json) deploys both folders as one Vercel project using [services](https://vercel.com/docs/services):

- `frontend` (Vite) is public at `/`.
- `backend` (Express) is public at `/api/*` and receives the full path, for example `/api/analyses`.

Both share one domain, so the browser calls `/api` directly and no CORS setup is needed. In the Vercel project settings, add the variables from `backend/.env.example` (`MONGODB_URI`, `JWT_SECRET`, `COHERE_API_KEY` and so on). If you use MongoDB Atlas, allow connections from anywhere (`0.0.0.0/0`), because Vercel functions don't have fixed IPs. Resume uploads are capped at 4 MB because Vercel limits request bodies to 4.5 MB.

Run `vercel dev` to try the deployed setup locally. `npm run dev` still works as before.
