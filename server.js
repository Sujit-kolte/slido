import { Server } from "socket.io";

export function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(` Connected: ${socket.id}`);

    // -------------------------
    // JOIN SESSION
    // -------------------------
    socket.on("session:join", ({ sessionId, userId }) => {
      if (!sessionId || !userId) {
        return socket.emit("system:error", {
          message: "Invalid join payload",
        });
      }

      socket.join(sessionId);
      socket.data.sessionId = sessionId;
      socket.data.userId = userId;

      const userCount = io.sockets.adapter.rooms.get(sessionId)?.size || 0;

      console.log(
        `👤 User ${userId} joined session ${sessionId} | Users: ${userCount}`,
      );

      io.to(sessionId).emit("system:user:count", {
        sessionId,
        userCount,
      });
    });

    // -------------------------
    // START QUESTION (ADMIN)
    // -------------------------
    socket.on("quiz:question:start", ({ sessionId, question }) => {
      if (!sessionId || !question) {
        return socket.emit("system:error", {
          message: "Invalid question payload",
        });
      }

      if (!socket.rooms.has(sessionId)) {
        return socket.emit("system:error", {
          message: "Socket not in session",
        });
      }

      console.log(`📢 Question started in session ${sessionId}`);

      io.to(sessionId).emit("quiz:question:start", {
        question,
        startedAt: Date.now(),
      });
    });

    // -------------------------
    // SUBMIT ANSWER
    // -------------------------
    socket.on("quiz:answer:submit", ({ sessionId, answer }) => {
      if (!sessionId || !answer) {
        return socket.emit("system:error", {
          message: "Invalid answer payload",
        });
      }

      if (!socket.rooms.has(sessionId)) {
        return socket.emit("system:error", {
          message: "Socket not in session",
        });
      }

      console.log(
        `Answer received | user=${socket.data.userId} | session=${sessionId}`,
      );

      // For MVP: just broadcast (no winner logic yet)
      io.to(sessionId).emit("quiz:answer:submit", {
        userId: socket.data.userId,
        answer,
        timestamp: Date.now(),
      });
    });

    // -------------------------
    // DISCONNECT
    // -------------------------
    socket.on("disconnect", () => {
      const sessionId = socket.data.sessionId;

      if (sessionId) {
        const userCount = io.sockets.adapter.rooms.get(sessionId)?.size || 0;

        console.log(
          ` Disconnected: ${socket.id} | session=${sessionId} | users=${userCount}`,
        );

        io.to(sessionId).emit("system:user:count", {
          sessionId,
          userCount,
        });
      }
    });
  });

  return io;
}
