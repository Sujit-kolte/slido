import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    // 🔴 IMPORTANT: This must be 'String' to accept codes like "QUIZ-101"
    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    questionText: {
      type: String,
      required: [true, "Question text is required"],
      maxlength: 500,
    },

    options: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
      },
    ],

    marks: { type: Number, default: 10 },

    status: { type: String, default: "ACTIVE" },
  },
  { timestamps: true },
);

export default mongoose.model("Question", questionSchema);
