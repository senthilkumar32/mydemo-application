import * as analysisService from "../service/analysis.service.js";
import * as jobRunService from "../service/jobRun.service.js";
import { HttpError, cleanString, clientKey } from "../utils.js";

const MAX_JD_LENGTH = 20000;

// Multipart form: `resume` (PDF file) + `jobDescription` (text).
// Signed-in users get the analysis saved to their history.
// A background job search starts too; its progress is read from /api/job-runs/:id.
export async function create(req, res) {
  if (!req.file) throw new HttpError(400, "Add your resume as a PDF.", "resume");

  const jobDescription = cleanString(req.body.jobDescription);
  if (!jobDescription) throw new HttpError(400, "Paste the job description you're applying for.", "jobDescription");
  if (jobDescription.length > MAX_JD_LENGTH) {
    throw new HttpError(400, `Keep the job description under ${MAX_JD_LENGTH.toLocaleString()} characters.`, "jobDescription");
  }

  const analysis = await analysisService.createAnalysis({ userId: req.userId, file: req.file, jobDescription });
  res.status(201).json({ analysis: analysis.toPublic(), ...(await startJobSearch(analysis, req)) });
}

// The job search never holds up or fails the analysis: without it the
// response says why, and the user can retry from their results.
async function startJobSearch(analysis, req) {
  try {
    return { jobRun: await jobRunService.startRun({ analysis, clientKey: clientKey(req) }) };
  } catch (err) {
    if (!(err instanceof HttpError)) console.error(`Couldn't start a job search: ${err.message}`);
    return {
      jobRun: null,
      jobRunError: err instanceof HttpError ? err.message : "We couldn't start a job search. Try again from your results.",
    };
  }
}

export async function list(req, res) {
  res.json({ analyses: await analysisService.listAnalyses(req.userId) });
}
