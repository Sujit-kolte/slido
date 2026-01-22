import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    // Session Code (e.g. QUIZ-101)
    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    questionText: {
      type: String,
      required: true,
      maxlength: 500,
    },

    options: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
      },
    ],

    marks: {
      type: Number,
      default: 10,
    },

    // 🔥 REQUIRED FOR MOVE UP / DOWN / SORT
    order: {
      type: Number,
      required: true,
      index: true,
    },

    status: {
      type: String,
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Question", questionSchema);
