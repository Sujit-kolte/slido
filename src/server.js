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
    // 🟢 FIX: Sanitize code to prevent mismatch (e.g. " QUIZ101 " vs "QUIZ101")
    if (code) {
      const cleanCode = String(code).trim().toUpperCase();
      socket.join(cleanCode);
      console.log(`Dm User ${socket.id} joined room: ${cleanCode}`);
    }
  });

  socket.on("sync:state", async (sessionCode) => {
    try {
      const code = String(sessionCode).trim().toUpperCase();
      const session = await Session.findOne({ sessionCode: code });

      // If no active question, tell client to wait
      if (!session || !session.currentQuestionId || !session.questionEndsAt) {
        socket.emit("sync:idle");
        return;
      }
      
      const remaining = Math.floor((session.questionEndsAt.getTime() - Date.now()) / 1000);
      
      // If time expired, wait for next
      if (remaining <= 0) {
        socket.emit("sync:idle");
        return;
      }

      const q = await Question.findById(session.currentQuestionId);
      if (!q) return;

      // Send the current question to the late joiner
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
     GAME START HANDLER
  ================================================== */
  socket.on("admin:start_game", async (sessionCode) => {
    try {
      const code = String(sessionCode).trim().toUpperCase();
      console.log(`🚀 Admin requested start for: ${code}`);

      // 1. Check if locked
      if (activeGames.has(code)) {
        console.log(`⚠️ Game ${code} is ALREADY RUNNING. Ignoring start request.`);
        return;
      }

      // 2. Find Session
      const session = await Session.findOne({ sessionCode: code });
      if (!session) {
        console.error("❌ Session not found in DB");
        return;
      }

      // 3. Force Status to ACTIVE
      if (session.status !== "ACTIVE") {
        console.log("⚡ Forcing DB status to ACTIVE...");
        await Session.updateOne({ sessionCode: code }, { status: "ACTIVE", startTime: new Date() });
      }

      // 4. Lock & Start
      activeGames.set(code, true);
      io.to(code).emit("game:started");

      const questions = await Question.find({ sessionId: code }).sort({ order: 1 });
      
      if (!questions.length) {
        console.error("❌ ERROR: No questions found. Unlocking.");
        activeGames.delete(code);
        return;
      }

      console.log(`✅ Starting Loop with ${questions.length} questions.`);
      
      // 5. Run Loop
      await runGameLoop(io, code, questions);
      
      // 6. Unlock when finished
      activeGames.delete(code);
      console.log(`LG Game loop finished. Unlocked ${code}`);

    } catch (e) {
      activeGames.delete(String(sessionCode).trim().toUpperCase());
      console.error("❌ Start Game Error:", e);
    }
  });
});

/* ================= CRASH-PROOF LOOP WITH KILL SWITCH ================= */
async function runGameLoop(io, room, questions) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    try {
      // 🟢 KILL SWITCH: Check if admin stopped the game
      const checkSession = await Session.findOne({ sessionCode: room }).select("status");
      if (!checkSession || checkSession.status !== "ACTIVE") {
        console.log("🛑 Game detected as STOPPED/COMPLETED. Exiting loop immediately.");
        io.to(room).emit("game:over"); // Optional: Send game over if stopped manually
        break; // Exit the for loop
      }

      console.log(`👉 Sending Question ${i + 1}/${questions.length}`);

      // 1. Update DB
      await Session.findOneAndUpdate(
        { sessionCode: room },
        { currentQuestionId: q._id, questionEndsAt: new Date(Date.now() + 15000) }
      );

      // 2. Broadcast Question
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

      // 3. Wait 15s
      await sleep(15000);

      // 4. Send Result
      const correctOpt = q.options ? q.options.find((o) => o.isCorrect) : null;
      io.to(room).emit("game:result", {
        correctAnswer: correctOpt ? correctOpt.text : "Error: No Answer",
      });

      // 5. Rank Calc
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

      // 6. Cleanup & Cooling
      await Session.findOneAndUpdate(
        { sessionCode: room },
        { currentQuestionId: null, questionEndsAt: null }
      );

      io.to(room).emit("leaderboard:update");

      // 7. Wait 5s
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
  // Only send Game Over if we finished normally (didn't break early)
  const finalCheck = await Session.findOne({ sessionCode: room }).select("status");
  if (finalCheck && finalCheck.status === "ACTIVE") {
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
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));