import Session from "../models/session.model.js";
import Participant from "../models/participant.model.js";
import Response from "../models/response.model.js";
import Question from "../models/question.model.js"; 

// 1. CREATE SESSION
export const createSession = async (req, res, next) => {
  try {
    const { title, description, sessionCode } = req.body;
    const code = sessionCode.toUpperCase();

    const existing = await Session.findOne({ sessionCode: code });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Session code already exists. Please choose another.",
      });
    }

    const session = await Session.create({
      title,
      description,
      sessionCode: code,
      status: "WAITING",
    });

    res.status(201).json({ success: true, message: "Session created", data: session });
  } catch (error) {
    next(error);
  }
};

// 2. GET ALL SESSIONS
export const getAllSessions = async (req, res, next) => {
  try {
    // Only show sessions that aren't deleted (if you use soft delete elsewhere)
    const sessions = await Session.find({ status: { $ne: "DELETED" } }).sort({ createdAt: -1 });
    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    next(error);
  }
};

// 3. GET SINGLE SESSION
export const getSessionByCode = async (req, res, next) => {
  try {
    const { sessionCode } = req.params;
    const session = await Session.findOne({
      sessionCode: sessionCode.toUpperCase(),
      status: { $ne: "DELETED" },
    });

    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

// 4. UPDATE STATUS (Start/Stop)
export const updateSessionStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;
    const io = req.app.get("io");

    if (!["WAITING", "ACTIVE", "FINISHED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const updateData = { status };
    if (status === "ACTIVE") updateData.startTime = new Date();

    const session = await Session.findByIdAndUpdate(sessionId, updateData, { new: true });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    if (status === "ACTIVE") {
      io.to(session.sessionCode).emit("session:start");
    }

    res.json({ success: true, message: `Status updated to ${status}`, data: session });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params; // Matches route /:sessionId

    // 1. Find the session first to get its CODE
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const { sessionCode } = session;

    // 2. Run all delete operations in parallel
    // We delete using BOTH the ID and the Code to be 100% sure we catch everything
    await Promise.all([
      // Delete the Session itself
      Session.findByIdAndDelete(sessionId),

      // Delete Questions (Try both ID and Code links)
      Question.deleteMany({ $or: [{ sessionId: sessionId }, { sessionId: sessionCode }] }),

      // Delete Participants (Usually linked by Code)
      Participant.deleteMany({ $or: [{ sessionId: sessionId }, { sessionId: sessionCode }] }),

      // Delete Responses (Usually linked by Session ID)
      Response.deleteMany({ sessionId: sessionId })
    ]);

    console.log(`🗑️ Deleted Session: ${session.title} (${sessionCode}) and all related data.`);

    res.status(200).json({ 
      success: true, 
      message: "Session and all associated participants, questions, and responses deleted." 
    });

  } catch (error) {
    console.error("Delete Error:", error);
    next(error);
  }
};

// 🟢 NEW: Reset Session (Keep Session/Questions, Delete Users)
export const resetSessionData = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const io = req.app.get("io");

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    // Delete Participants and Responses
    await Promise.all([
      Participant.deleteMany({ sessionId: session.sessionCode }),
      Response.deleteMany({ sessionId: sessionId })
    ]);

    // Reset Status
    session.status = "WAITING";
    await session.save();

    // Notify clients to reset
    if (io) io.to(session.sessionCode).emit("session:reset");

    res.json({ success: true, message: "♻️ Session reset! Ready for new players." });
  } catch (error) {
    next(error);
  }
};