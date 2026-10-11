// Client-side checks and copy for the resume-vs-JD analysis.
// The comparison itself happens on the server (POST /api/analyses).

export const LOADING_STEPS = ["Reading your resume", "Picking out what the job asks for", "Matching skills", "Adding up your score"];
export const STEP_MS = 600;
const MAX_SIZE = 5 * 1024 * 1024;
export const MAX_JD_LENGTH = 20000;

// Returns an error message, or null if the file is acceptable.
export function validateFile(file) {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return `${file.name} isn't a PDF. Export your resume as a PDF and drop it in again.`;
  }
  if (file.size > MAX_SIZE) {
    return `${file.name} is over 5 MB. Remove large images or compress the PDF, then try again.`;
  }
  return null;
}

export function validateJobDescription(text) {
  if (!text.trim()) return "Paste the job description you're applying for.";
  if (text.length > MAX_JD_LENGTH) return `Keep the job description under ${MAX_JD_LENGTH.toLocaleString()} characters.`;
  return null;
}

export function scoreBand(score) {
  if (score >= 80) return { label: "Ready to send", summary: "You cover most of what this job asks for. Tighten the wording and apply." };
  if (score >= 60) return { label: "Almost there", summary: "A solid match. Adding two or three of the skills below would lift your score." };
  return { label: "Needs work", summary: "This job asks for several skills your resume doesn't mention. Start with the first few below." };
}
