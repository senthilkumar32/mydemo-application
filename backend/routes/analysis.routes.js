import { Router } from "express";
import * as analyses from "../controller/analysis.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { uploadResume } from "../middleware/upload.js";

const router = Router();

router.post("/", optionalAuth, uploadResume, analyses.create);
router.get("/", requireAuth, analyses.list);

export default router;
