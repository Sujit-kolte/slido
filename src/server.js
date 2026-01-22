import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";

import Question from "./models/question.model.js";
import Session from "./models/session.model.js";
import Participant from "./models/participant.model.js"; 
import dns from "dns";

// Fix for some network environments
dns.setServers(["8.8.8.8", "8.8.4.4"]);

dotenv.config();

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(async () => {
    console.log("✅ MongoDB Connected");
    await Session.updateMany(
      { status: "ACTIVE" },
      { currentQuestionId: null, questionEndsAt: null }
    );
    console.log("🔄 Session recovery done");
  })
  .catch((err) => console.error("❌ Mongo Error:", err.message));

/* ================= SERVER ================= */
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.set("io", io);

const activeGames = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  socket.on("join:session", (code) => {
    if (code) socket.join(String(code).toUpperCase());
  });

  socket.on("sync:state", async (sessionCode) => {
    try {
      const code = String(sessionCode).toUpperCase();
      const session = await Session.findOne({ sessionCode: code });

      if (!session || !session.currentQuestionId || !session.questionEndsAt) {
        socket.emit("sync:idle");
        return;
      }
      const remaining = Math.floor((session.questionEndsAt.getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        socket.emit("sync:idle");
        return;
      }
      const q = await Question.findById(session.currentQuestionId);
      if (!q) return;

      socket.emit("game:question", {
        question: {
          _id: q._id,
          questionText: q.questionText,
          options: q.options.map((o) => ({ text: o.text })),
        },
        time: remaining,
        isSync: true,
      });
    } catch (e) {
      console.error("❌ Sync error:", e);
    }
  });

  socket.on("admin:start_game", async (sessionCode) => {
    try {
      const code = String(sessionCode).toUpperCase();
      if (activeGames.has(code)) return;

      const session = await Session.findOne({ sessionCode: code });
      if (!session || session.status !== "ACTIVE") return;

      activeGames.set(code, true);
      io.to(code).emit("game:started");

      const questions = await Question.find({ sessionId: code }).sort({ order: 1 });
      if (!questions.length) return;

      await runGameLoop(io, code, questions);
      activeGames.delete(code);
    } catch (e) {
      activeGames.delete(String(sessionCode).toUpperCase());
      console.error("❌ Game error:", e);
    }
  });
});

/* ================= GAME LOOP ================= */
async function runGameLoop(io, room, questions) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    // 1. Send Question
    await Session.findOneAndUpdate(
      { sessionCode: room },
      { currentQuestionId: q._id, questionEndsAt: new Date(Date.now() + 15000) }
    );

    io.to(room).emit("game:question", {
      question: {
        _id: q._id,
        questionText: q.questionText,
        options: q.options.map((o) => ({ text: o.text })),
      },
      qNum: i + 1,
      total: questions.length,
      time: 15,
    });

    // 2. Wait 15s
    await sleep(15000);

    // 3. Send Correct Answer
    io.to(room).emit("game:result", {
      correctAnswer: q.options.find((o) => o.isCorrect)?.text,
    });

    // ======================================================
    // 🟢 RANK CALCULATION (FIXED)
    // ======================================================
    try {
      // ✅ FIX: Use 'sessionId' because that is what your model uses
     // 1. Get all players for this session
// ✅ FIX: Use 'sessionId' (matches your Participant Model)
const allPlayers = await Participant.find({ sessionId: room }) 
  .sort({ totalScore: -1 })
  .lean();

      // 2. Map to a clean list
      const rankList = allPlayers.map((p, index) => ({
        id: String(p._id), // Ensure it's a string for comparison
        rank: index + 1,
        score: p.totalScore || 0,
        name: p.name
      }));

      console.log(`📊 Sending Ranks for ${room}:`, rankList.length, "players");

      // 3. Send to everyone
      io.to(room).emit("game:ranks", rankList);

    } catch (err) {
      console.error("❌ Rank Calculation Failed:", err);
    }
    // ======================================================

    // 4. Cleanup & Cooling
    await Session.findOneAndUpdate(
      { sessionCode: room },
      { currentQuestionId: null, questionEndsAt: null }
    );

    io.to(room).emit("leaderboard:update");

    // 5. WAIT 5 SECONDS (This is when user sees rank)
    await sleep(5000);
  }

  await Session.findOneAndUpdate({ sessionCode: room }, { status: "COMPLETED" });
  io.to(room).emit("game:over");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));