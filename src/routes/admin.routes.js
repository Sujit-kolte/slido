import express from "express";
import { adminAuth } from "../middleware/admin.middleware.js";
// Note: If you have a controller for creating sessions, import it here:
// import { createSession, updateGameState } from "../controllers/session.controller.js";

const router = express.Router();

// ==========================================
// 🟢 ROUTE 1: Verify Admin Passcode (Login)
// ==========================================
// This handles the request from your admin.html page.
// It uses the 'adminAuth' middleware to check the password.
// If valid, it sends back a 200 OK response.
router.post("/verify-passcode", adminAuth, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Login successful! Welcome Admin.",
    isAdmin: true,
  });
});

// ==========================================
// 🟢 ROUTE 2: Protected Admin Actions
// ==========================================
// You can add other admin-only routes here.
// Example: Creating a new game session
// router.post("/create-session", adminAuth, (req, res) => {
//    // Your logic to create a game goes here
//    res.json({ message: "Session created" });
// });

// Example: Resetting a game
// router.post("/reset-game", adminAuth, (req, res) => {
//    // Your logic to reset goes here
// });

export default router;
