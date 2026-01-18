import { Router } from "express";
import { validateSessionCode } from "../middlewares/session.middleware.js";
import {
  joinSession,
  getLeaderboard,
} from "../controllers/participant.controller.js";

// 1. Import the logic to handle answers
// (Ensure you created response.controller.js as discussed previously)
import { submitResponse } from "../controllers/response.controller.js";

const router = Router();

// --- Routes ---

// 1. Join Session (Checks if active, returns ID)
router.post("/join", validateSessionCode, joinSession);

// 2. Submit Answer (Verifies option against DB)
// 🔴 THIS WAS MISSING
router.post("/submit", submitResponse);

// 3. Leaderboard
router.get("/leaderboard/:sessionCode", validateSessionCode, getLeaderboard);

export default router;
