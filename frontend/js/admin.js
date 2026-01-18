const express = require("express");
const cors = require("cors"); // Required for frontend to talk to backend
const app = express();

// 1. Allow the frontend to talk to the backend
app.use(cors());
app.use(express.json());

// 2. Your Middleware (from your question)
const adminAuth = (req, res, next) => {
  const passcode = req.headers["admin-passcode"]?.toString();
  // Ensure you have ADMIN_PASSCODE in your .env file
  if (!passcode || passcode !== process.env.ADMIN_PASSCODE) {
    return res.status(403).json({
      success: false,
      message: "Invalid admin passcode",
    });
  }
  req.isAdmin = true;
  next();
};

// 3. The Route the frontend calls
app.post("/api/admin/login", adminAuth, (req, res) => {
  // If the code reaches here, the middleware passed!
  res.status(200).json({
    success: true,
    message: "Welcome Admin!",
  });
});

app.listen(5000, () => console.log("Server running on port 5000"));
