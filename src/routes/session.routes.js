import { Router } from "express";
import { adminAuth } from "../middlewares/admin.middleware.js";
import {
  createSession,
  getAllSessions,
  getSessionByCode,
  updateSessionStatus,
  resetSessionData, // 🟢 Imported
  deleteSession     // 🟢 Imported
} from "../controllers/session.controller.js";
import { deleteSessionPermanently } from "../controllers/session.controller.js";

const router = Router();

// Create a new session
router.post("/", adminAuth, createSession);

// Get all sessions (Admin Dashboard)
router.get("/", getAllSessions);

// Get specific session by Code (Player Join)
router.get("/:sessionCode", getSessionByCode);

// Update Session Status (Active/Inactive)
router.put("/:sessionId/status", adminAuth, updateSessionStatus);

// Delete Session (Cascade Delete)
router.delete("/:sessionId", adminAuth, deleteSession);

// Reset Session Data (Keep Session/Questions, Delete Users/Responses)
router.delete("/:sessionId/data", adminAuth, resetSessionData);

router.delete(
  "/code/:sessionCode/permanent",
  adminAuth,
  deleteSessionPermanently
);



export default router;