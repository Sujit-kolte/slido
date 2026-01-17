import { Router } from "express";
import { validateSessionCode } from "../middlewares/session.middleware.js";
import { joinSession, getLeaderboard } from "../controllers/participant.controller.js";

const router = Router();
router.post("/join", validateSessionCode, joinSession);
router.get("/leaderboard/:sessionCode", validateSessionCode, getLeaderboard);

export default router;
