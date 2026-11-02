import * as jobRunService from "../service/jobRun.service.js";
import { resumeStalledRuns } from "../service/jobAgent.js";
import { config } from "../config/index.js";
import { HttpError, cleanString, clientKey, sameSecret } from "../utils.js";

const MAX_LOCATION_LENGTH = 100;

// Anonymous users prove a run is theirs with the token they got when it started.
const runToken = (req) => req.get("x-run-token") || undefined;

// JSON: { analysisId, location?, remoteOnly? }
export async function create(req, res) {
  const location = cleanString(req.body.location);
  if (location.length > MAX_LOCATION_LENGTH) {
    throw new HttpError(400, `Keep the location under ${MAX_LOCATION_LENGTH} characters.`, "location");
  }
  const jobRun = await jobRunService.startRunForAnalysis({
    analysisId: cleanString(req.body.analysisId),
    userId: req.userId,
    token: runToken(req),
    clientKey: clientKey(req),
    filters: { location: location || undefined, remoteOnly: req.body.remoteOnly === true },
  });
  res.status(201).json({ jobRun });
}

// ?since=<cursor> returns only matches added after the last poll.
export async function show(req, res) {
  res.json(
    await jobRunService.getRun({
      id: req.params.id,
      userId: req.userId,
      token: runToken(req),
      since: cleanString(req.query.since) || undefined,
    })
  );
}

export async function latest(req, res) {
  res.json(await jobRunService.latestRun(req.userId));
}

export async function cancel(req, res) {
  res.json({ jobRun: await jobRunService.cancelRun({ id: req.params.id, userId: req.userId, token: runToken(req) }) });
}

// Vercel Cron: resume runs whose worker died or never started, and start
// the daily refresh for users who opted in.
export async function sweep(req, res) {
  const [scheme, secret] = (req.get("authorization") || "").split(" ");
  if (!config.cronSecret || scheme !== "Bearer" || !sameSecret(secret ?? "", config.cronSecret)) {
    throw new HttpError(401, "Not allowed.");
  }
  res.json({ resumed: await resumeStalledRuns(), refreshed: await jobRunService.startDailyRefreshes() });
}
