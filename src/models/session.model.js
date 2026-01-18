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
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "COMPLETED", "DELETED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Session", sessionSchema);
// Add this temporarily in server.js to clean the database rules

mongoose.connection.once("open", async () => {
  try {
    console.log("🧹 Cleaning up old database rules...");

    // 1. Drop the "Global" Unique Index on participantNumber (The cause of your error)
    await mongoose.connection.db
      .collection("participants")
      .dropIndex("participantNumber_1");
    console.log("✅ Success: Removed the Global 'P001' restriction.");
  } catch (e) {
    console.log("Note: Global index was already gone (This is good).");
  }
});
