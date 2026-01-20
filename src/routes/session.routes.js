import { Router } from "express";
import { adminAuth } from "../middlewares/admin.middleware.js";
import {
  createSession,
  deleteSession,
  getAllSessions,
  getSessionByCode,
  updateSessionStatus,
} from "../controllers/session.controller.js";

const router = Router();

// 1. Create a new Session (Admin only)
router.post("/", adminAuth, createSession);

// 2. Delete a Session (Admin only)
router.delete("/:sessionId", adminAuth, deleteSession);

// 3. Get All Sessions (For Admin Dashboard)
router.get("/", getAllSessions);

// 4. Get Single Session by Code (For Players joining)
router.get("/:sessionCode", getSessionByCode);

// 5. 🟢 Update Status (Start/Stop Game)
// Changed to PUT and moved :sessionId to the front for standard REST API structure
// Usage: PUT /api/sessions/65a123bc.../status
router.put("/:sessionId/status", adminAuth, updateSessionStatus);

export default router;
