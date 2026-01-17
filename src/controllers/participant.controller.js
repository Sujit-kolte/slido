import Participant from "../models/participant.model.js";
import Session from "../models/session.model.js";

export const joinSession = async (req, res, next) => {
  try {
    const { name } = req.body;
    const session = req.session;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: "Name must be at least 2 characters" 
      });
    }

    const existing = await Participant.findOne({ 
      sessionId: session._id, 
      name: name.trim() 
    });
    if (existing) {
      return res.json({
        success: true,
        message: "Already joined",
        data: {
          participantId: existing._id,
          participantNumber: existing.participantNumber,
          name: existing.name
        }
      });
    }

    const participant = await Participant.create({
      sessionId: session._id,
      name: name.trim()
    });

    res.status(201).json({
      success: true,
      message: "Joined successfully",
      data: {
        participantId: participant._id,
        participantNumber: participant.participantNumber,
        name: participant.name
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaderboard = async (req, res, next) => {
  try {
    const session = req.session;
    const participants = await Participant.find({ sessionId: session._id })
      .sort({ totalScore: -1, createdAt: 1 })
      .limit(50);

    const leaderboard = participants.map((p, i) => ({
      rank: i + 1,
      participantNumber: p.participantNumber,
      name: p.name,
      totalScore: p.totalScore,
      joinedAt: p.createdAt
    }));

    res.json({
      success: true,
      count: leaderboard.length,
      data: leaderboard
    });
  } catch (error) {
    next(error);
  }
};
