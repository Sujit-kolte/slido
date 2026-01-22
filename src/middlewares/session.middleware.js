import Session from "../models/session.model.js";

export const validateSessionCode = async (req, res, next) => {
  try {
    const { sessionCode } = req.body || req.params;
    if (!sessionCode) {
      return res.status(400).json({ success: false, message: "Session code required" });
    }

    const session = await Session.findOne({ 
      sessionCode: sessionCode.toUpperCase(), 
      status: { $in: ["ACTIVE", "COMPLETED"] } 
    });
    
    if (!session) {
      return res.status(404).json({ success: false, message: "Invalid or inactive session" });
    }

    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
};
