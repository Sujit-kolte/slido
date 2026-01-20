import Question from "../models/question.model.js";
import Session from "../models/session.model.js";

/* ===============================
   CREATE QUESTION (UNCHANGED)
================================ */
export const createQuestion = async (req, res, next) => {
  try {
    const { sessionId, questionText, options, marks = 10 } = req.body;

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: "Min 2 options required" });
    }

    const session = await Session.findOne({
      sessionCode: { $regex: new RegExp(`^${sessionId}$`, "i") },
    });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const order = await Question.countDocuments({
      sessionId: session.sessionCode,
    });

    const question = await Question.create({
      sessionId: session.sessionCode,
      questionText,
      options,
      marks,
      order,
      status: "ACTIVE",
    });

    res.status(201).json({ success: true, data: question });
  } catch (e) {
    next(e);
  }
};

/* ===============================
   GET QUESTIONS BY SESSION (UNCHANGED)
================================ */
export const getQuestionsBySession = async (req, res, next) => {
  try {
    const { sessionCode } = req.params;

    const questions = await Question.find({
      sessionId: { $regex: new RegExp(`^${sessionCode}$`, "i") },
      status: "ACTIVE",
    }).sort({ order: 1 });

    res.json({ success: true, data: questions });
  } catch (e) {
    next(e);
  }
};

/* ===============================
   🔥 NEW: GET SINGLE QUESTION
   (FIXES EDIT + PREVIEW)
================================ */
export const getQuestionById = async (req, res, next) => {
  try {
    const q = await Question.findById(req.params.id);
    if (!q) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.json({ success: true, data: q });
  } catch (e) {
    next(e);
  }
};

/* ===============================
   UPDATE QUESTION (UNCHANGED)
================================ */
export const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { questionText, options } = req.body;

    const q = await Question.findById(id);
    if (!q) return res.status(404).json({ message: "Not found" });

    q.questionText = questionText;
    q.options = options;
    await q.save();

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

/* ===============================
   DELETE QUESTION (UNCHANGED)
================================ */
export const deleteQuestion = async (req, res, next) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

/* ===============================
   DUPLICATE QUESTION (UNCHANGED)
================================ */
export const duplicateQuestion = async (req, res, next) => {
  try {
    const q = await Question.findById(req.params.id);
    if (!q) return res.status(404).json({ message: "Not found" });

    const order = await Question.countDocuments({ sessionId: q.sessionId });

    const copy = await Question.create({
      sessionId: q.sessionId,
      questionText: q.questionText + " (Copy)",
      options: q.options,
      marks: q.marks,
      order,
      status: "ACTIVE",
    });

    res.json({ success: true, data: copy });
  } catch (e) {
    next(e);
  }
};
/* ===============================
   REORDER QUESTIONS (FIXED)
================================ */
export const reorderQuestions = async (req, res, next) => {
  try {
    /* -------- BULK REORDER (OLD FEATURE) -------- */
    if (Array.isArray(req.body.order)) {
      for (const item of req.body.order) {
        await Question.findByIdAndUpdate(item.id, {
          order: item.order,
        });
      }
      return res.json({ success: true });
    }

    /* -------- UP / DOWN (FIXED & SAFE) -------- */
    const { questionId, direction } = req.body;

    const current = await Question.findById(questionId);
    if (!current) {
      return res.status(404).json({ message: "Question not found" });
    }

    // 🔥 STEP 1: normalize order for session
    const questions = await Question.find({
      sessionId: current.sessionId,
    }).sort({ order: 1 });

    for (let i = 0; i < questions.length; i++) {
      questions[i].order = i;
      await questions[i].save();
    }
   

const session = await Session.findOne({
  sessionCode: current.sessionId,
});

if (session?.status === "ACTIVE") {
  return res.status(400).json({
    message: "Cannot reorder while session is ACTIVE",
  });
}


    // 🔥 STEP 2: re-fetch after normalization
    const normalized = await Question.find({
      sessionId: current.sessionId,
    }).sort({ order: 1 });

    const index = normalized.findIndex(q => q.id === questionId);

    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === normalized.length - 1)
    ) {
      return res.json({ success: true });
    }

    const swapIndex = direction === "up" ? index - 1 : index + 1;

    const temp = normalized[index].order;
    normalized[index].order = normalized[swapIndex].order;
    normalized[swapIndex].order = temp;

    await normalized[index].save();
    await normalized[swapIndex].save();

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};
