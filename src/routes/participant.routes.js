import { Router } from "express";

import {
  joinSession,
  submitAnswer,
  getLeaderboard,
  getParticipantStats, // 🟢 Imported
  getGameHistory       // 🟢 Imported
} from "../controllers/participant.controller.js";

const router = Router();

/* =========================
   PARTICIPANT ROUTES
========================= */

// 1️⃣ Join Session
router.post("/join", joinSession);

// 2️⃣ Submit Answer (atomic)
router.post("/submit", submitAnswer);

// 3️⃣ Leaderboard
router.get("/leaderboard/:sessionCode", getLeaderboard);

// 4️⃣ 🟢 Get Stats (End Game)
router.get("/stats/:participantId", getParticipantStats);

// 5️⃣ 🟢 Get History (End Game Review)
router.get("/history/:participantId", getGameHistory);

export default router;