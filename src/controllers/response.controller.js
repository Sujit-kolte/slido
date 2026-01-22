import Response from "../models/response.model.js";
import Question from "../models/question.model.js";
import Participant from "../models/participant.model.js";
import mongoose from "mongoose";

export const submitResponse = async (req, res, next) => {
  try {
    const { questionId, participantId, selectedOption } = req.body;
    const io = req.app.get("io");

    // 1. Basic Validation
    if (!questionId || !participantId) {
      return res.status(400).json({ message: "Missing IDs" });
    }

    // 2. Find Question
    const question = await Question.findById(questionId);
    if (!question)
      return res.status(404).json({ message: "Question not found" });

    // 3. Find Correct Option
    const correctOptionObj = question.options.find((o) => o.isCorrect === true);
    const correctText = correctOptionObj ? correctOptionObj.text : "N/A";

    // 🛑 SUPER DEBUG LOGS 🛑
    console.log("\n====== 🔍 ANSWER VERIFICATION DEBUG ======");
    console.log(`1. User Sent Raw:      '${selectedOption}'`);
    console.log(`2. DB Correct Raw:     '${correctText}'`);

    // 4. THE COMPARISON LOGIC
    let isCorrect = false;

    if (correctOptionObj && selectedOption) {
      const userClean = String(selectedOption).trim().toLowerCase();
      const dbClean = String(correctText).trim().toLowerCase();
      if (userClean === dbClean) {
        isCorrect = true;
      }
    }

    console.log(
      `4. Final Result:       ${isCorrect ? "✅ MATCH" : "❌ NO MATCH"}`,
    );
    console.log("==========================================\n");

    // 5. Calculate Marks
    const marks = isCorrect ? question.marks || 10 : 0;

    // 6. Handle Duplicates
    const existing = await Response.findOne({ questionId, participantId });
    if (existing) {
      console.log("⚠️ Duplicate ignored.");
      return res.status(200).json({
        success: true,
        isCorrect: existing.isCorrect,
        marks: existing.marksObtained,
      });
    }

    // 7. Save to DB
    await Response.create({
      questionId,
      participantId,
      selectedOption,
      isCorrect,
      marksObtained: marks,
    });

    // 8. Update Score
    if (isCorrect) {
      await Participant.findByIdAndUpdate(participantId, {
        $inc: { totalScore: marks },
      });
    }

    // 9. Update Socket
    if (question.sessionId) {
      io.to(String(question.sessionId)).emit("leaderboard:update");
    }

    res.json({ success: true, isCorrect, marks });
  } catch (e) {
    console.error("Server Error:", e);
    next(e);
  }
};
