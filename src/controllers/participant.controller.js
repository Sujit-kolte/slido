import Participant from "../models/participant.model.js";
import Session from "../models/session.model.js";

// 1. JOIN SESSION
export const joinSession = async (req, res, next) => {
  try {
    const { name, sessionCode } = req.body;

    // A. Validate Input
    if (!name || name.trim().length < 2) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name must be at least 2 characters",
        });
    }
    if (!sessionCode) {
      return res
        .status(400)
        .json({ success: false, message: "Session Code is required" });
    }

    // B. Find the ACTIVE Session (and get its title)
    // We search by the string code "QUIZ-101"
    const session = await Session.findOne({
      sessionCode: sessionCode,
      status: "ACTIVE",
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found or is currently closed.",
      });
    }

    // C. Check if user already joined (Handle duplicates)
    let participant = await Participant.findOne({
      sessionId: sessionCode,
      name: name.trim(),
    });

    // If exists, just log them back in
    if (participant) {
      return res.status(200).json({
        success: true,
        message: "Welcome back!",
        data: {
          participantId: participant._id,
          name: participant.name,
          sessionCode: session.sessionCode,
          sessionTitle: session.title || "Untitled Session", // <--- Sending Title back
        },
      });
    }

    // D. Create New Participant if not exists
    participant = await Participant.create({
      sessionId: sessionCode, // Link by code string
      name: name.trim(),
      score: 0,
    });

    res.status(201).json({
      success: true,
      message: "Joined successfully",
      data: {
        participantId: participant._id,
        name: participant.name,
        sessionCode: session.sessionCode,
        sessionTitle: session.title || "Untitled Session", // <--- Sending Title back
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET LEADERBOARD
export const getLeaderboard = async (req, res, next) => {
  try {
    // We get the code from the URL params: /api/participants/leaderboard/QUIZ-101
    const { sessionCode } = req.params;

    const participants = await Participant.find({ sessionId: sessionCode })
      .sort({ score: -1, createdAt: 1 }) // Use 'score' or 'totalScore' based on your model
      .limit(50);

    const leaderboard = participants.map((p, i) => ({
      rank: i + 1,
      name: p.name,
      totalScore: p.score || 0, // Fallback to 0
      joinedAt: p.createdAt,
    }));

    res.json({
      success: true,
      count: leaderboard.length,
      data: leaderboard,
    });
  } catch (error) {
    next(error);
  }
};
