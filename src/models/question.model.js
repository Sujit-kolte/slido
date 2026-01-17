import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true, index: true },
  questionText: { type: String, required: true, maxlength: 500 },
  options: [{
    text: { type: String, required: true, maxlength: 200 },
    isCorrect: Boolean
  }],
  questionType: { type: String, enum: ["MCQ"], default: "MCQ" },
  marks: { type: Number, default: 10, min: 0, max: 100 },
  upvotes: { type: Number, default: 0 },
  status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" }
}, { timestamps: true });

export default mongoose.model("Question", questionSchema);
