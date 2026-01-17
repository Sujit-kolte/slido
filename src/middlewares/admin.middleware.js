export const adminAuth = (req, res, next) => {
  const passcode = req.headers['admin-passcode']?.toString();
  if (!passcode || passcode !== process.env.ADMIN_PASSCODE) {
    return res.status(403).json({ 
      success: false, 
      message: "Invalid admin passcode" 
    });
  }
  req.isAdmin = true;
  next();
};
