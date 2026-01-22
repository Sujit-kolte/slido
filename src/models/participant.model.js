import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    participantNumber: {
      type: String,
      unique: true,
    },

    totalScore: {
      type: Number,
      default: 0,
    },

    // ✅ Correct answers (already used)
    rightAnswersBucket: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Question",
      default: [],
    },

    // 🔥 REQUIRED (prevents double submission)
    attemptedQuestions: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Question",
      default: [],
    },
  },
  { timestamps: true }
);

/* =====================================================
   🔥 INDEXES (CRITICAL FOR 500+ USERS)
===================================================== */

// Fast leaderboard sorting
participantSchema.index({ sessionId: 1, totalScore: -1 });

// Prevent duplicate joins by same name
participantSchema.index({ sessionId: 1, name: 1 });

// Fast atomic answer checks
participantSchema.index({ _id: 1, attemptedQuestions: 1 });

export default mongoose.model("Participant", participantSchema);
