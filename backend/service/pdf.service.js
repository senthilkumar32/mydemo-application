import { PDFParse } from "pdf-parse";
import { HttpError } from "../utils.js";

export async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });
  let text;
  try {
    ({ text } = await parser.getText());
  } catch {
    throw new HttpError(400, "We couldn't open that PDF. It may be damaged or password-protected.", "resume");
  } finally {
    await parser.destroy();
  }

  text = text.replace(/\s+/g, " ").trim();
  // Scanned resumes are images, so there is no text layer to read.
  if (text.length < 50) {
    throw new HttpError(400, "We couldn't find any text in that PDF. If it's a scan, export it from your editor as a text PDF.", "resume");
  }
  return text;
}
