export const adminAuth = (req, res, next) => {
  // Check the header for 'admin-passcode'
  const passcode = req.headers["admin-passcode"]?.toString();

  // Compare with the secret in your .env file (or default to 12345)
  const SYSTEM_PASSCODE = process.env.ADMIN_PASSCODE || "12345";

  if (!passcode || passcode !== SYSTEM_PASSCODE) {
    return res.status(403).json({
      success: false,
      message: "Invalid admin passcode",
    });
  }

  req.isAdmin = true;
  next(); // <-- This lets the request proceed to the route handler
};
