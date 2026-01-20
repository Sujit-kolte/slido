import Session from "../models/session.model.js";

// 1. CREATE SESSION
export const createSession = async (req, res, next) => {
  try {
    const { title, description, sessionCode } = req.body;

    // Force uppercase for consistency
    const code = sessionCode.toUpperCase();

    // Check if code exists
    const existing = await Session.findOne({ sessionCode: code });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Session code already exists. Please choose another.",
      });
    }

    // 🟢 UPDATED: Default status is "WAITING".
    // This creates the "Lobby" state.
    const session = await Session.create({
      title,
      description,
      sessionCode: code,
      status: "WAITING",
    });

    res.status(201).json({
      success: true,
      message: "Session created successfully",
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET ALL SESSIONS (Admin Dashboard)
export const getAllSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ status: { $ne: "DELETED" } }).sort({
      createdAt: -1,
    });

    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    next(error);
  }
};

// 3. GET SINGLE SESSION (By Code)
export const getSessionByCode = async (req, res, next) => {
  try {
    const { sessionCode } = req.params;

    const session = await Session.findOne({
      sessionCode: sessionCode.toUpperCase(),
      status: { $ne: "DELETED" },
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

// 4. UPDATE STATUS (Start/Stop Game) 🟢 CRITICAL UPDATE
export const updateSessionStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.params; // Admin usually clicks by ID
    const { status } = req.body;

    // 🟢 GET SOCKET INSTANCE
    const io = req.app.get("io");

    const allowedStatuses = ["WAITING", "ACTIVE", "FINISHED"];

    if (!allowedStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    // Prepare the update object
    const updateData = { status };

    // 🟢 IF STARTING, RECORD TIME (For Late Join Sync)
    if (status === "ACTIVE") {
      updateData.startTime = new Date();
    }

    // Update in DB
    const session = await Session.findByIdAndUpdate(
      sessionId,
      updateData,
      { new: true }, // Return updated doc (Need sessionCode for socket)
    );

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    // 🟢 SOCKET EMIT: TELL EVERYONE TO START!
    // We emit to the room named after the sessionCode (e.g., "QUIZ-101")
    if (status === "ACTIVE") {
      io.to(session.sessionCode).emit("session:start");
      console.log(
        `🚀 SIGNAL SENT: Session ${session.sessionCode} is now ACTIVE.`,
      );
    }

    res.json({
      success: true,
      message: `Session status updated to ${status}`,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

// 5. DELETE SESSION (Soft Delete)
export const deleteSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    await Session.findByIdAndUpdate(sessionId, { status: "DELETED" });

    res.json({ success: true, message: "Session deleted successfully" });
  } catch (error) {
    next(error);
  }
};
