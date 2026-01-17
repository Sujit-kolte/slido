import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      sparse: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "PARTICIPANT"],
      default: "PARTICIPANT",
    },
    phone: String,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
