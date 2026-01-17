import { Router } from "express";
import { adminAuth } from "../middlewares/admin.middleware.js";
import { createSession, deleteSession, getAllSessions, getSessionByCode } from "../controllers/session.controller.js";

const router = Router();
router.post("/", adminAuth, createSession);
router.delete("/:sessionId", adminAuth, deleteSession);
router.get("/", getAllSessions);
router.get("/:sessionCode", getSessionByCode);

export default router;
