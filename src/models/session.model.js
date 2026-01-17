import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, maxlength: 500 },
  sessionCode: { type: String, required: true, unique: true, uppercase: true, maxlength: 20 },
  status: { type: String, enum: ["ACTIVE", "INACTIVE", "COMPLETED", "DELETED"], default: "ACTIVE" },
}, { timestamps: true });

export default mongoose.model("Session", sessionSchema);
