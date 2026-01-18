import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    // 1. Session ID is a String
    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    // 2. REMOVED "unique: true" from here. It must be a simple string.
    participantNumber: {
      type: String,
    },

    name: { type: String, required: true, maxlength: 50 },
    totalScore: { type: Number, default: 0, min: 0 },
    rank: Number,
  },
  { timestamps: true },
);

// 3. Logic to generate P001, P002 based on THAT session count
participantSchema.pre("save", async function (next) {
  if (this.isNew && !this.participantNumber) {
    const count = await mongoose
      .model("Participant")
      .countDocuments({ sessionId: this.sessionId });
    this.participantNumber = `P${String(count + 1).padStart(3, "0")}`;
  }
  next();
});

// 🔴 4. THE FIX: Create a "Compound Index"
// This tells DB: "You can have duplicate P001s, BUT you cannot have the same P001 inside the same Session."
participantSchema.index(
  { sessionId: 1, participantNumber: 1 },
  { unique: true },
);

// Also ensure one user (Name) can't join the same session twice
participantSchema.index({ sessionId: 1, name: 1 }, { unique: true });

export default mongoose.model("Participant", participantSchema);
