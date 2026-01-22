import Session from "../models/session.model.js";
import Participant from "../models/participant.model.js";
import Response from "../models/response.model.js";

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

// 5. DELETE SESSION (Soft Delete)
export const deleteSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    await Session.findByIdAndUpdate(sessionId, { status: "DELETED" });
    res.json({ success: true, message: "Session deleted" });
  } catch (error) {
    next(error);
  }
};

// 6. RESET SESSION (Clear Users & Responses)
export const resetSessionData = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const io = req.app.get("io"); // 🟢 Get Socket Instance

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    const sessionCode = session.sessionCode;

    // 1. Find Participants
    const participants = await Participant.find({ sessionId: sessionCode });
    const participantIds = participants.map(p => p._id);

    // 2. Delete Data
    await Response.deleteMany({ participantId: { $in: participantIds } });
    await Participant.deleteMany({ sessionId: sessionCode });

    // 3. Reset Session State
    session.status = "WAITING";
    session.currentQuestionId = null;
    session.questionEndsAt = null;
    session.startTime = null;
    await session.save();

    // 🟢 4. Notify Leaderboard to CLEAR
    if (io) {
      io.to(sessionCode).emit("leaderboard:update");
    }

    res.json({ success: true, message: "♻️ Session reset! Ready for new players." });
  } catch (error) {
    next(error);
  }
};