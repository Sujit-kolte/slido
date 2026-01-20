import { Router } from "express";

import {
  joinSession,
  submitAnswer,    // ✅ ATOMIC scoring controller
  getLeaderboard,  // ✅ REQUIRED by frontend + projector
} from "../controllers/participant.controller.js";

const router = Router();

/* =========================
   PARTICIPANT ROUTES
========================= */

// 1️⃣ Join Session
router.post("/join", joinSession);

// 2️⃣ Submit Answer (atomic, race-condition safe)
router.post("/submit", submitAnswer);

// 3️⃣ Leaderboard (used by phones + projector)
router.get("/leaderboard/:sessionCode", getLeaderboard);

export default router;
