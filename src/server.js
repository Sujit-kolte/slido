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
    // Reset any stuck active sessions on startup
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

  /* ==================================================
     🟢 FIXED: ROBUST GAME START HANDLER
     This forces the game to start even if the API 
     is slow to update the status.
  ================================================== */
  socket.on("admin:start_game", async (sessionCode) => {
    try {
      const code = String(sessionCode).toUpperCase();
      console.log(`🚀 Request to start game: ${code}`);

      // 1. Prevent double starts
      if (activeGames.has(code)) {
        console.log(`⚠️ Game ${code} is already running.`);
        return;
      }

      // 2. Find Session
      const session = await Session.findOne({ sessionCode: code });
      if (!session) {
        console.error("❌ Session not found in DB");
        return;
      }

      // 3. 🟢 FORCE STATUS UPDATE (Fixes the race condition)
      if (session.status !== "ACTIVE") {
        console.log("⚡ Forcing status to ACTIVE...");
        await Session.updateOne({ sessionCode: code }, { status: "ACTIVE", startTime: new Date() });
      }

      // 4. Lock this session
      activeGames.set(code, true);
      io.to(code).emit("game:started");

      // 5. Fetch Questions
      const questions = await Question.find({ sessionId: code }).sort({ order: 1 });
      
      if (!questions.length) {
        console.error("❌ ERROR: No questions found for session:", code);
        activeGames.delete(code); // Release lock
        return;
      }

      console.log(`✅ Starting Loop with ${questions.length} questions.`);
      
      // 6. Run the Loop
      await runGameLoop(io, code, questions);
      
      activeGames.delete(code); // Release lock when done
    } catch (e) {
      activeGames.delete(String(sessionCode).toUpperCase());
      console.error("❌ Start Game Error:", e);
    }
  });
});

/* ================= CRASH-PROOF GAME LOOP ================= */
async function runGameLoop(io, room, questions) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    try {
      console.log(`👉 Sending Question ${i + 1}/${questions.length}`);

      // 1. Send Question Data to Database
      await Session.findOneAndUpdate(
        { sessionCode: room },
        { currentQuestionId: q._id, questionEndsAt: new Date(Date.now() + 15000) }
      );

      // 2. Broadcast to Users (This removes "Waiting for host")
      io.to(room).emit("game:question", {
        question: {
          _id: q._id,
          questionText: q.questionText,
          options: (q.options || []).map((o) => ({ text: o.text })),
        },
        qNum: i + 1,
        total: questions.length,
        time: 15,
      });

      // 3. Wait 15s (Question Timer)
      await sleep(15000);

      // 4. Send Correct Answer
      const correctOpt = q.options ? q.options.find((o) => o.isCorrect) : null;
      io.to(room).emit("game:result", {
        correctAnswer: correctOpt ? correctOpt.text : "Error: No Answer",
      });

      // ======================================================
      // 🟢 RANK CALCULATION
      // ======================================================
      try {
        const allPlayers = await Participant.find({ sessionId: room }) 
          .sort({ totalScore: -1 })
          .lean();

        const rankList = allPlayers.map((p, index) => ({
          id: String(p._id),
          rank: index + 1,
          score: p.totalScore || 0,
          name: p.name
        }));

        io.to(room).emit("game:ranks", rankList);
      } catch (err) {
        console.error("⚠️ Rank Calc Warning:", err.message);
      }

      // 5. Cleanup & Cooling
      await Session.findOneAndUpdate(
        { sessionCode: room },
        { currentQuestionId: null, questionEndsAt: null }
      );

      io.to(room).emit("leaderboard:update");

      // 6. Wait 5s (Leaderboard Timer)
      await sleep(5000);

    } catch (err) {
      console.error(`❌ CRASHED on Question ${i + 1}:`, err);
      console.log("⚠️ Skipping to next question in 3 seconds...");
      io.to(room).emit("game:error", { message: "Question Error. Skipping..." });
      await sleep(3000);
      continue; 
    }
  }

  // ======================================================
  // 🏁 GAME OVER
  // ======================================================
  try {
    const winners = await Participant.find({ sessionId: room })
      .sort({ totalScore: -1 })
      .limit(3)
      .select("name totalScore")
      .lean();

    await Session.findOneAndUpdate({ sessionCode: room }, { status: "COMPLETED" });
    
    console.log(`🏁 Game ${room} Completed.`);
    io.to(room).emit("game:over", { winners });
    
  } catch (e) {
    console.error("❌ Game Over Logic Error:", e);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));