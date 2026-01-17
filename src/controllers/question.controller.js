import Question from "../models/question.model.js";

export const createQuestion = async (req, res, next) => {
  try {
    const { sessionId, questionText, options, marks = 10 } = req.body;

    if (!Array.isArray(options) || options.length === 0) {
      return res.status(400).json({ success: false, message: "Options required" });
    }

    const question = await Question.create({
      sessionId,
      questionText,
      options,
      marks
    });

    res.status(201).json({
      success: true,
      message: "Question created",
      data: question
    });
  } catch (error) {
    next(error);
  }
};

export const getQuestionsBySession = async (req, res, next) => {
  try {
    const { sessionId } = req.session;

    const questions = await Question.find({
      sessionId,
      status: "ACTIVE"
    }).sort({ createdAt: 1 });

    res.json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    next(error);
  }
};
