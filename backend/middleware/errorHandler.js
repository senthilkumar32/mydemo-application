import multer from "multer";
import { HttpError } from "../utils.js";

export function notFound(req, res) {
  res.status(404).json({ message: "Not found." });
}

// Every error leaves as { message, field? } so the UI can show it next to the right input.
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, field: err.field });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "Your resume is over 4 MB. Remove large images or compress the PDF, then try again."
      : "We couldn't read that upload. Try choosing the file again.";
    return res.status(400).json({ message, field: "resume" });
  }
  console.error(err);
  res.status(500).json({ message: "Something went wrong on our side. Try again in a minute." });
}
