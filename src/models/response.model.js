import mongoose from "mongoose";

const responseSchema = new mongoose.Schema({
  questionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Question", 
    required: true,
    index: true 
  },
  participantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Participant", 
    required: true,
    index: true 
  },
  selectedOption: { type: String, maxlength: 200 },
  isCorrect: Boolean,
  marksObtained: { type: Number, default: 0 }
}, { timestamps: true });

// Unique index: One answer per participant per question
responseSchema.index({ questionId: 1, participantId: 1 }, { unique: true });

export default mongoose.model("Response", responseSchema);
