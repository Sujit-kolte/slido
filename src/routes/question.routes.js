import { Router } from "express";
import { adminAuth } from "../middlewares/admin.middleware.js";
import { validateSessionCode } from "../middlewares/session.middleware.js";
import { createQuestion, getQuestionsBySession } from "../controllers/question.controller.js";

const router = Router();
router.post("/", adminAuth, createQuestion);
router.get("/session/:sessionCode", validateSessionCode, getQuestionsBySession);

export default router;
