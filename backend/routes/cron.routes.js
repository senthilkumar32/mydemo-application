import { Router } from "express";
import * as jobRuns from "../controller/jobRun.controller.js";

const router = Router();

router.get("/job-agent", jobRuns.sweep);

export default router;
