import { Router } from "express";
import * as jobRuns from "../controller/jobRun.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", optionalAuth, jobRuns.create);
// Before /:id, or "latest" would be read as a run id.
router.get("/latest", requireAuth, jobRuns.latest);
router.get("/:id", optionalAuth, jobRuns.show);
router.post("/:id/cancel", optionalAuth, jobRuns.cancel);

export default router;
