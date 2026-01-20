import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    sessionCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      maxlength: 20,
    },
    currentQuestionId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Question",
  default: null,
},

questionEndsAt: {
  type: Date,
  default: null,
},

    status: {
      type: String,
      // 🟢 FIX 1: Add "WAITING" to the allowed list
      enum: ["WAITING", "ACTIVE", "INACTIVE", "COMPLETED", "DELETED"],

      // 🟢 FIX 2: Set default to "WAITING" (Lobby Mode)
      default: "WAITING",
    },

    // 🟢 FIX 3: Add startTime (Critical for Late Join Timer Sync)
    startTime: { type: Date },
  },
  
  { timestamps: true },
);

export default mongoose.model("Session", sessionSchema);
