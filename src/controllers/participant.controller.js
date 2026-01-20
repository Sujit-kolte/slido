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

    const uniqueCode = Math.floor(1000 + Math.random() * 9000).toString();

    if (!participant) {
      participant = await Participant.create({
        sessionId: session.sessionCode,
        name: name.trim(),
        participantNumber: uniqueCode // <--- ADD THIS
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
   2. SUBMIT ANSWER (ATOMIC + ANTI-CHEAT)
===================================================== */
export const submitAnswer = async (req, res, next) => {
  try {
    const { participantId, questionId, selectedOption, timeLeft } = req.body;

    // 🔒 Validate session & active question (SERVER IS SOURCE OF TRUTH)
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

    const correctOption = question.options.find((o) => o.isCorrect);
    const isCorrect = correctOption?.text === selectedOption;

    const safeTime = Math.max(0, Math.min(Number(timeLeft || 0), 15));
    const scoreDelta = isCorrect
      ? 10 + Math.round((safeTime / 15) * 10)
      : -1;

    // 🔥 ATOMIC UPDATE (NO DOUBLE SCORE POSSIBLE)
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

    // 🔄 Optional realtime leaderboard refresh (non-breaking)
    req.app
      .get("io")
      ?.to(session.sessionCode)
      ?.emit("leaderboard:update");

    res.json({
      success: true,
      message: "Answer recorded",
    });
  } catch (err) {
    next(err);
  }
};

/* =====================================================
   3. LEADERBOARD (EXPORT REQUIRED BY ROUTES)
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
