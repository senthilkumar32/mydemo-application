import multer from "multer";
import { HttpError } from "../utils.js";

// Accepts a single PDF in the `resume` field, kept in memory only:
// we store the extracted text, never the file.
export const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    if (isPdf) return cb(null, true);
    cb(new HttpError(400, `${file.originalname} isn't a PDF. Export your resume as a PDF and try again.`, "resume"));
  },
}).single("resume");
