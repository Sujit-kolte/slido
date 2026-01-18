import Question from "../models/question.model.js";

// 1. Create Question (Admin uses this)
export const createQuestion = async (req, res, next) => {
  try {
    const { sessionId, questionText, options, marks = 10 } = req.body;

    if (!Array.isArray(options) || options.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Options required" });
    }

    const question = await Question.create({
      sessionId, // matches "QUIZ-101" string
      questionText,
      options,
      marks,
    });

    res.status(201).json({
      success: true,
      message: "Question created",
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get Questions (Player uses this)
export const getQuestionsBySession = async (req, res, next) => {
  try {
    // 🔴 CHANGED: Read from URL params, not req.session
    // Expected URL: /api/questions/session/QUIZ-101
    const { sessionCode } = req.params;

    const questions = await Question.find({
      sessionId: sessionCode, // Matches the string "QUIZ-101"
      status: "ACTIVE",
    }).sort({ createdAt: 1 });

    res.json({
      success: true,
      count: questions.length,
      data: questions,
    });
  } catch (error) {
    next(error);
  }
};
