import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true, index: true },
  participantNumber: { type: String, unique: true, sparse: true },
  name: { type: String, required: true, maxlength: 50 },
  totalScore: { type: Number, default: 0, min: 0 },
  rank: Number
}, { timestamps: true });

// Auto-generate P001, P002... on first save
participantSchema.pre('save', async function(next) {
  if (this.isNew && !this.participantNumber) {
    const count = await mongoose.model('Participant').countDocuments({ sessionId: this.sessionId });
    this.participantNumber = `P${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

export default mongoose.model("Participant", participantSchema);
