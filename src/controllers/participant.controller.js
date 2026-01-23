import Participant from "../models/participant.model.js";
import Session from "../models/session.model.js";
import Question from "../models/question.model.js";
import Response from "../models/response.model.js"; 

/* =====================================================
   1. JOIN SESSION (RECONNECT OR NEW ENTRY)
===================================================== */
export const joinSession = async (req, res, next) => {
  try {
    const { name, sessionCode, existingParticipantId } = req.body;

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
            totalScore: existingUser.totalScore,
          },
        });
      }
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Invalid name" });
    }

    const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();

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
   2. SUBMIT ANSWER (SMART CHECKING + HISTORY SAVE)
===================================================== */
export const submitAnswer = async (req, res, next) => {
  try {
    const { participantId, questionId, selectedOption, timeLeft } = req.body;

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

    const correctOptionObj = question.options.find((o) => o.isCorrect);

    const correctText = correctOptionObj
      ? correctOptionObj.text.trim().toLowerCase()
      : "";
    const userText = selectedOption
      ? String(selectedOption).trim().toLowerCase()
      : "";

    const isCorrect = correctText === userText;
    const safeTime = Math.max(0, Math.min(Number(timeLeft || 0), 15));
    const scoreDelta = isCorrect ? 10 + Math.round((safeTime / 15) * 10) : 0;

    // 1. ATOMIC SCORE UPDATE
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

    // 2. 🟢 SAVE HISTORY (Critical for "Review Answers" feature)
    // We catch errors here to prevent duplicates from crashing the request
    try {
      await Response.create({
        questionId,
        participantId,
        selectedOption,
        isCorrect,
        marksObtained: scoreDelta,
        sessionId: session.sessionCode // Helpful for bulk cleanup
      });
    } catch (e) {
      console.log("History save skipped (duplicate)");
    }

    // 3. Update Leaderboard
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

/* =====================================================
   4. GET STATS (Correct, Wrong, Timeout)
===================================================== */
export const getParticipantStats = async (req, res, next) => {
  try {
    const { participantId } = req.params;

    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).json({ success: false, message: "Participant not found" });
    }

    const totalQuestions = await Question.countDocuments({
      sessionId: participant.sessionId
    });

    const correct = participant.rightAnswersBucket.length;
    const attempted = participant.attemptedQuestions.length;
    
    const wrong = attempted - correct;
    const timeout = totalQuestions - attempted;

    res.json({
      success: true,
      data: {
        correct,
        wrong,
        timeout,
        totalScore: participant.totalScore
      }
    });
  } catch (err) {
    next(err);
  }
};

/* =====================================================
   5. GET FULL GAME HISTORY
===================================================== */
export const getGameHistory = async (req, res, next) => {
  try {
    const { participantId } = req.params;

    const participant = await Participant.findById(participantId);
    if (!participant) return res.status(404).json({ message: "Participant not found" });

    // 1. Get Questions
    const questions = await Question.find({ sessionId: participant.sessionId })
      .sort({ order: 1 })
      .lean();

    // 2. Get Responses
    const responses = await Response.find({ participantId }).lean();

    // 3. Merge
    const history = questions.map(q => {
      const userResponse = responses.find(r => String(r.questionId) === String(q._id));
      const correctOption = q.options.find(o => o.isCorrect);
      
      let status = "TIMEOUT";
      let userSelected = "No Attempt";

      if (userResponse) {
        status = userResponse.isCorrect ? "CORRECT" : "WRONG";
        userSelected = userResponse.selectedOption;
      }

      return {
        questionText: q.questionText,
        correctAnswer: correctOption ? correctOption.text : "N/A",
        userSelected: userSelected,
        status: status 
      };
    });

    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};