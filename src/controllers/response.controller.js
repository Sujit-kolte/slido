import Response from "../models/response.model.js";
import Question from "../models/question.model.js";
import Participant from "../models/participant.model.js";
import mongoose from "mongoose";
// import { io } from "../server.js"; // Keep this if you have Socket.io set up

export const submitResponse = async (req, res, next) => {
  try {
    const { questionId, participantId, selectedOption } = req.body;

    // 1. VALIDATION: Check if IDs are valid MongoDB ObjectIds
    // This stops the "Invalid ID format" server crash
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Question ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Participant ID" });
    }

    // 2. FIND QUESTION
    // We search only by ID because _id is unique.
    // We removed 'req.session' because the user is stateless.
    const question = await Question.findById(questionId);

    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    // 3. CHECK DUPLICATE
    const existing = await Response.findOne({ questionId, participantId });
    if (existing) {
      // Return success:false but don't crash, just tell UI it's done
      return res.status(200).json({
        success: false,
        message: "Already answered",
        isCorrect: existing.isCorrect,
      });
    }

    // 4. CHECK ANSWER
    // Find the option in the array where isCorrect is true
    const correctOptionObj = question.options.find((o) => o.isCorrect);

    // Compare the text sent by user vs the correct text in DB
    const isCorrect =
      correctOptionObj && correctOptionObj.text === selectedOption;
    const marks = isCorrect ? question.marks || 10 : 0;

    // 5. SAVE RESPONSE
    await Response.create({
      questionId,
      participantId,
      selectedOption,
      isCorrect,
      marksObtained: marks,
    });

    // 6. UPDATE SCORE
    // Using 'totalScore' to match your previous code snippet
    if (isCorrect) {
      await Participant.findByIdAndUpdate(participantId, {
        $inc: { totalScore: marks },
      });
    }

    /* // OPTIONAL: Socket.io Update
    if (io) {
       io.to(question.sessionId).emit("leaderboard:update", { 
           sessionCode: question.sessionId 
       });
    }
    */

    res.json({ success: true, isCorrect, marks });
  } catch (e) {
    next(e);
  }
};
