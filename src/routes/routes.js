import { Router } from "express";
import sessionRoutes from "./session.routes.js";
import questionRoutes from "./question.routes.js";
import responseRoutes from "./response.routes.js";
import participantRoutes from "./participant.routes.js";

// Import the middleware
import { adminAuth } from "../middlewares/admin.middleware.js";

const router = Router();

// --- 1. ADD THIS: Admin Verification Route ---
// The frontend calls POST /api/admin/login
router.post("/admin/login", adminAuth, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin verified successfully",
  });
});

// --- 2. Existing Sub-Routes ---
router.use("/sessions", sessionRoutes);
router.use("/questions", questionRoutes);
router.use("/responses", responseRoutes);
router.use("/participants", participantRoutes);

export default router;
