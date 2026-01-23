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
      status: "WAITING", // ✅ Feature Preserved
    });

    res.status(201).json({ success: true, message: "Session created", data: session });
  } catch (error) {
    next(error);
  }
};

// 2. GET ALL SESSIONS
export const getAllSessions = async (req, res, next) => {
  try {
    // ✅ Feature Preserved: Only show non-deleted sessions
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

    // ✅ Feature Preserved: Added COMPLETED to list to match your server loop
    if (!["WAITING", "ACTIVE", "FINISHED", "COMPLETED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const updateData = { status };
    // ✅ Feature Preserved: Timer sync logic
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

/* =========================================================
   5. 🟢 ROBUST DELETE SESSION (Fixed)
   Now finds participants first, so it can delete responses
   even if they are missing the sessionId field.
========================================================= */
export const deleteSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const { sessionCode, _id } = session;
    console.log(`🗑️ Deleting Session: ${sessionCode}`);

    // 1. Find all participants to get their IDs
    const participants = await Participant.find({ 
      $or: [{ sessionId: sessionCode }, { sessionId: _id }] 
    }).select("_id");
    
    const participantIds = participants.map(p => p._id);

    // 2. Perform Clean Delete
    await Promise.all([
      Session.findByIdAndDelete(_id),
      Participant.deleteMany({ _id: { $in: participantIds } }),
      Question.deleteMany({ $or: [{ sessionId: sessionCode }, { sessionId: _id }] }),
      
      // 🟢 FIX: Delete by Session ID OR by Participant IDs (catches everything)
      Response.deleteMany({ 
        $or: [
          { sessionId: sessionCode }, 
          { sessionId: _id },
          { participantId: { $in: participantIds } } 
        ] 
      })
    ]);

    res.status(200).json({ 
      success: true, 
      message: "Session and ALL related data deleted." 
    });

  } catch (error) {
    console.error("Delete Error:", error);
    next(error);
  }
};

/* =========================================================
   6. 🟢 ROBUST RESET DATA (Fixed)
   Deletes Users & Responses, but keeps the Session & Questions.
========================================================= */
export const resetSessionData = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const io = req.app.get("io");

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    // 1. Find all participants for this session
    const participants = await Participant.find({ sessionId: session.sessionCode }).select("_id");
    const participantIds = participants.map(p => p._id);

    console.log(`♻️ Resetting ${session.sessionCode}: Cleaning ${participantIds.length} users...`);

    // 2. Delete Responses linked to these users (Works for OLD data too)
    await Response.deleteMany({ participantId: { $in: participantIds } });

    // 3. Delete Responses linked by SessionID (Works for NEW data)
    await Response.deleteMany({ sessionId: sessionId });

    // 4. Delete the Participants
    await Participant.deleteMany({ _id: { $in: participantIds } });

    // 5. Reset Session Status
    session.status = "WAITING"; // ✅ Feature Preserved
    session.currentQuestionId = null;
    session.questionEndsAt = null;
    await session.save();

    if (io) io.to(session.sessionCode).emit("session:reset");

    res.json({ success: true, message: "♻️ Session reset! Ready for new players." });
  } catch (error) {
    next(error);
  }
};

export const deleteSessionPermanently = async (req, res, next) => {
  try {
    const { sessionCode } = req.params;
    const code = sessionCode.toUpperCase();

    const session = await Session.findOne({ sessionCode: code });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    req.app.get("io")?.to(code).emit("game:force_stop");

    const questions = await Question.find({ sessionId: code }).select("_id");
    const participants = await Participant.find({ sessionId: code }).select("_id");

    const questionIds = questions.map((q) => q._id);
    const participantIds = participants.map((p) => p._id);

    await Promise.all([
      Response.deleteMany({
        $or: [
          { questionId: { $in: questionIds } },
          { participantId: { $in: participantIds } },
        ],
      }),

      Participant.deleteMany({ sessionId: code }),
      Question.deleteMany({ sessionId: code }),
      Session.deleteOne({ sessionCode: code }),
    ]);

    res.json({
      success: true,
      message: "Session and all related data deleted permanently",
    });
  } catch (err) {
    next(err);
  }
};