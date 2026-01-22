import { Router } from "express";
import { adminAuth } from "../middlewares/admin.middleware.js";
import {
  createSession,
  deleteSession,
  getAllSessions,
  getSessionByCode,
  updateSessionStatus,
  resetSessionData // 🟢 Import this
} from "../controllers/session.controller.js";

const router = Router();

router.post("/", adminAuth, createSession);
router.delete("/:sessionId", adminAuth, deleteSession); // Delete Session
router.get("/", getAllSessions);
router.get("/:sessionCode", getSessionByCode);
router.put("/:sessionId/status", adminAuth, updateSessionStatus);

// 🟢 NEW ROUTE: Reset Data (Delete Users/Responses)
router.delete("/:sessionId/data", adminAuth, resetSessionData);

export default router;