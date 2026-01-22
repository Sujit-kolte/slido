import Participant from "../models/participant.model.js";
import Session from "../models/session.model.js";
import Question from "../models/question.model.js";

/* =====================================================
   1. JOIN SESSION (RECONNECT OR NEW ENTRY)
===================================================== */
export const joinSession = async (req, res, next) => {
  try {
    // ⬇️ Update: Accept 'existingParticipantId' from frontend
    const { name, sessionCode, existingParticipantId } = req.body;

    // 1. Validate Session
    const session = await Session.findOne({
      sessionCode: { $regex: new RegExp(`^${sessionCode}$`, "i") },
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    if (!["WAITING", "ACTIVE"].includes(session.status)) {
      return res
        .status(400)
        .json({ success: false, message: "Session closed" });
    }

    // =========================================================
    // 🔄 LOGIC A: RECONNECT EXISTING USER (If ID provided)
    // =========================================================
    if (existingParticipantId) {
      const existingUser = await Participant.findOne({
        _id: existingParticipantId,
        sessionId: session.sessionCode,
      });

      if (existingUser) {
        return res.json({
          success: true,
          message: "Welcome back!",
          data: {
            participantId: existingUser._id,
            name: existingUser.name,
            uniqueCode: existingUser.participantNumber,
            sessionCode: session.sessionCode,
            sessionTitle: session.title || "Untitled Session",
            totalScore: existingUser.totalScore, // Send score so UI updates
          },
        });
      }
    }

    // =========================================================
    // 🆕 LOGIC B: CREATE NEW USER (Allows Duplicate Names)
    // =========================================================

    // Validate Name only if creating NEW user
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Invalid name" });
    }

    // Generate random 6-char code
    const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 🔥 Force Create New Entry (We removed the 'findOne({ name })' check)
    const participant = await Participant.create({
      sessionId: session.sessionCode,
      name: name.trim(),
      participantNumber: uniqueCode,
    });

    res.json({
      success: true,
      data: {
        participantId: participant._id,
        name: participant.name,
        uniqueCode: participant.participantNumber,
        sessionCode: session.sessionCode,
        sessionTitle: session.title || "Untitled Session",
      },
    });
  } catch (err) {
    next(err);
  }
};

/* =====================================================
   2. SUBMIT ANSWER (SMART CHECKING + ATOMIC)
===================================================== */
export const submitAnswer = async (req, res, next) => {
  try {
    const { participantId, questionId, selectedOption, timeLeft } = req.body;

    // 🔒 Validate session & active question
    const session = await Session.findOne({ currentQuestionId: questionId });

    if (
      !session ||
      !session.currentQuestionId ||
      String(session.currentQuestionId) !== String(questionId) ||
      new Date() > session.questionEndsAt
    ) {
      return res.status(400).json({
        success: false,
        message: "Question not active or time up",
      });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // 🟢 SMART CHECKING: Ignore Case & Spaces
    const correctOptionObj = question.options.find((o) => o.isCorrect);

    const correctText = correctOptionObj
      ? correctOptionObj.text.trim().toLowerCase()
      : "";
    const userText = selectedOption
      ? String(selectedOption).trim().toLowerCase()
      : "";

    const isCorrect = correctText === userText;

    const safeTime = Math.max(0, Math.min(Number(timeLeft || 0), 15));

    // Give 10 pts base + speed bonus. 0 if wrong.
    const scoreDelta = isCorrect ? 10 + Math.round((safeTime / 15) * 10) : 0;

    // 🔥 ATOMIC UPDATE
    const result = await Participant.updateOne(
      {
        _id: participantId,
        attemptedQuestions: { $ne: questionId },
      },
      {
        $inc: { totalScore: scoreDelta },
        $addToSet: {
          attemptedQuestions: questionId,
          ...(isCorrect && { rightAnswersBucket: questionId }),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.json({
        success: true,
        message: "Already answered",
      });
    }

    // 🔄 Update Leaderboard
    req.app.get("io")?.to(session.sessionCode)?.emit("leaderboard:update");

    res.json({
      success: true,
      message: isCorrect ? "Correct" : "Wrong",
      added: scoreDelta,
    });
  } catch (err) {
    next(err);
  }
};

/* =====================================================
   3. LEADERBOARD
===================================================== */
export const getLeaderboard = async (req, res, next) => {
  try {
    const { sessionCode } = req.params;

    const participants = await Participant.find({
      sessionId: { $regex: new RegExp(`^${sessionCode}$`, "i") },
    })
      .sort({ totalScore: -1, createdAt: 1 })
      .limit(50)
      .select("name participantNumber totalScore createdAt");

    const leaderboard = participants.map((p, index) => ({
      rank: index + 1,
      name: p.name,
      uniqueCode: p.participantNumber,
      totalScore: p.totalScore,
      joinedAt: p.createdAt,
    }));

    res.json({
      success: true,
      count: leaderboard.length,
      data: leaderboard,
    });
  } catch (err) {
    next(err);
  }
};
