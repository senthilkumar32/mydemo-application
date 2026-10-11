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
cp .env.example .env     # then set MONGODB_URI and JWT_SECRET
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
| POST | `/api/analyses` | optional | Multipart: `resume` (PDF, 5 MB max) + `jobDescription` → `{ analysis }`. Saved to the user's history when signed in. |
| GET | `/api/analyses` | Bearer | The user's last 20 analyses |

Errors come back as `{ message, field? }`, where `field` names the form input the message belongs to.

## Adding the AI comparison

Scoring today is keyword matching in [backend/service/compare.service.js](backend/service/compare.service.js): it finds the skills the job description asks for, using the list in `skills.js`, and checks which of them the resume mentions. To switch to AI, replace `compare()` and keep its return shape, `{ score, present, missing, engine }`. Each analysis stores the extracted resume text and the JD, so past analyses can be re-scored without another upload.
