import { Router } from "express";
import * as auth from "../controller/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/signup", auth.signUp);
router.post("/signin", auth.signIn);
router.get("/me", requireAuth, auth.me);

export default router;
