import * as analysisService from "../service/analysis.service.js";
import { HttpError, cleanString } from "../utils.js";

const MAX_JD_LENGTH = 20000;

// Multipart form: `resume` (PDF file) + `jobDescription` (text).
// Signed-in users get the analysis saved to their history.
export async function create(req, res) {
  if (!req.file) throw new HttpError(400, "Add your resume as a PDF.", "resume");

  const jobDescription = cleanString(req.body.jobDescription);
  if (!jobDescription) throw new HttpError(400, "Paste the job description you're applying for.", "jobDescription");
  if (jobDescription.length > MAX_JD_LENGTH) {
    throw new HttpError(400, `Keep the job description under ${MAX_JD_LENGTH.toLocaleString()} characters.`, "jobDescription");
  }

  const analysis = await analysisService.createAnalysis({ userId: req.userId, file: req.file, jobDescription });
  res.status(201).json({ analysis });
}

export async function list(req, res) {
  res.json({ analyses: await analysisService.listAnalyses(req.userId) });
}
