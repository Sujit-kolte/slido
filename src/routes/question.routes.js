import { Router } from "express";
import { adminAuth } from "../middlewares/admin.middleware.js";
// import { validateSessionCode } from "../middlewares/session.middleware.js"; // 🔴 Comment this out for now

import {
  createQuestion,
  getQuestionsBySession,
} from "../controllers/question.controller.js";

const router = Router();

// Admin creates questions (Needs Auth)
router.post("/", adminAuth, createQuestion);

// User fetches questions (Public/Open access for players)
// 🔴 Removed validateSessionCode to prevent crashes during testing
router.get("/session/:sessionCode", getQuestionsBySession);

export default router;
