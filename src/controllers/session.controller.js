import Session from "../models/session.model.js";

export const createSession = async (req, res, next) => {
  try {
    const { title, description, sessionCode } = req.body;
    
    const existing = await Session.findOne({ 
      sessionCode: sessionCode.toUpperCase() 
    });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: "Session code already exists" 
      });
    }

    const session = await Session.create({
      title,
      description,
      sessionCode: sessionCode.toUpperCase(),
      status: "ACTIVE"
    });

    res.status(201).json({
      success: true,
      message: "Session created",
      data: session
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    await Session.findByIdAndUpdate(sessionId, { status: "DELETED" });
    res.json({ success: true, message: "Session soft deleted" });
  } catch (error) {
    next(error);
  }
};

export const getAllSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ status: { $ne: "DELETED" } })
      .sort({ createdAt: -1 });
    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    next(error);
  }
};

export const getSessionByCode = async (req, res, next) => {
  try {
    const { sessionCode } = req.params;
    const session = await Session.findOne({ 
      sessionCode: sessionCode.toUpperCase(),
      status: { $ne: "DELETED" }
    });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};
