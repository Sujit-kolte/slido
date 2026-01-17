import Response from "../models/response.model.js";
import Question from "../models/question.model.js";
import Participant from "../models/participant.model.js";
import { io } from "../server.js";

export const submitResponse = async (req, res, next) => {
  try {
    const { questionId, participantId, selectedOption } = req.body;
    const session = req.session;

    const question = await Question.findOne({
      _id: questionId,
      sessionId: session._id,
      status: "ACTIVE"
    });

    if (!question) {
      return res.status(400).json({ message: "Invalid question" });
    }

    const existing = await Response.findOne({ questionId, participantId });
    if (existing) {
      return res.json({ message: "Already answered" });
    }

    const correct = question.options.find(o => o.isCorrect);
    const isCorrect = correct?.text === selectedOption;
    const marks = isCorrect ? question.marks : 0;

    await Response.create({
      questionId,
      participantId,
      selectedOption,
      isCorrect,
      marksObtained: marks
    });

    await Participant.findByIdAndUpdate(participantId, {
      $inc: { totalScore: marks }
    });

    // 🔥 LIVE EVENT
    io.to(session.sessionCode).emit("leaderboard:update", {
      sessionCode: session.sessionCode
    });

    res.json({ success: true, isCorrect, marks });
  } catch (e) {
    next(e);
  }
};
