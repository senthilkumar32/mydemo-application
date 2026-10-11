import { Analysis } from "../models/Analysis.js";
import { extractPdfText } from "./pdf.service.js";
import { compare } from "./compare.service.js";

// Read the resume, compare it with the JD, and save the result.
export async function createAnalysis({ userId, file, jobDescription }) {
  const resumeText = await extractPdfText(file.buffer);
  const result = compare(resumeText, jobDescription);

  const analysis = await Analysis.create({
    user: userId ?? undefined,
    fileName: file.originalname,
    resumeText,
    jobDescription,
    ...result,
  });
  return analysis.toPublic();
}

export async function listAnalyses(userId, limit = 20) {
  const analyses = await Analysis.find({ user: userId }).sort({ createdAt: -1 }).limit(limit);
  return analyses.map((a) => a.toPublic());
}
