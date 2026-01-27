import express from "express";
const router = express.Router();

// 🟢 THIS ROUTE MATCHES YOUR FRONTEND REQUEST
router.post("/verify-passcode", (req, res) => {
  // 1. Get passcode from headers OR body (covers both cases)
  const passcode = req.headers["admin-passcode"] || req.body["admin-passcode"];

  // 2. Define the correct password (from Env or default)
  const SYSTEM_PASSCODE = process.env.ADMIN_PASSCODE || "12345";

  // 3. Check
  if (passcode === SYSTEM_PASSCODE) {
    return res.status(200).json({
      success: true,
      message: "Login Successful",
    });
  } else {
    return res.status(403).json({
      success: false,
      message: "Invalid Passcode",
    });
  }
});

export default router;
