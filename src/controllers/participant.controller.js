import Participant from "../models/participant.model.js";
import Session from "../models/session.model.js";
import Question from "../models/question.model.js";

/* =====================================================
   1. JOIN SESSION (FRONTEND SAFE)
===================================================== */
export const joinSession = async (req, res, next) => {
  try {
    const { name, sessionCode } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Invalid name",
      });
    }

    const session = await Session.findOne({
      sessionCode: { $regex: new RegExp(`^${sessionCode}$`, "i") },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    if (!["WAITING", "ACTIVE"].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: "Session closed",
      });
    }

    let participant = await Participant.findOne({
      sessionId: session.sessionCode,
      name: name.trim(),
    });

    if (!participant) {
      // ✅ NEW LOGIC: 6-char Alphanumeric (e.g., "7K9P2X")
      const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      participant = await Participant.create({
        sessionId: session.sessionCode,
        name: name.trim(),
        participantNumber: uniqueCode 
      });
    }

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
    
    // Safety check in case correctOptionObj is undefined
    const correctText = correctOptionObj ? correctOptionObj.text.trim().toLowerCase() : "";
    const userText = selectedOption ? String(selectedOption).trim().toLowerCase() : "";

    const isCorrect = correctText === userText;

    const safeTime = Math.max(0, Math.min(Number(timeLeft || 0), 15));
    
    // Give 10 pts base + speed bonus. 0 if wrong (don't subtract).
    const scoreDelta = isCorrect
      ? 10 + Math.round((safeTime / 15) * 10)
      : 0;

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
      }
    );

    if (result.matchedCount === 0) {
      return res.json({
        success: true,
        message: "Already answered",
      });
    }

    // 🔄 Update Leaderboard
    req.app
      .get("io")
      ?.to(session.sessionCode)
      ?.emit("leaderboard:update");

    res.json({
      success: true,
      message: isCorrect ? "Correct" : "Wrong",
      added: scoreDelta
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