import mongoose from "mongoose";

const responseSchema = new mongoose.Schema(
  {
    // 🟢 ADDED: Session ID (Helper for bulk deletes)
    sessionId: {
      type: String, 
      index: true,
      required: false // Optional, so it doesn't break old data
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      index: true,
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
      index: true,
    },
    selectedOption: { type: String, maxlength: 200 },
    isCorrect: Boolean,
    marksObtained: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Prevent a user from answering the same question twice
responseSchema.index({ questionId: 1, participantId: 1 }, { unique: true });

export default mongoose.model("Response", responseSchema);