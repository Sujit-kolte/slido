import { useEffect, useState } from "react";
import { socket } from "../lib/socket";

export default function Home() {
  const [users, setUsers] = useState(0);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");

  const sessionId = "room-101";
  const userId = Math.random().toString(36).slice(2, 7);

  useEffect(() => {
    socket.connect();

    socket.emit("session:join", { sessionId, userId });

    socket.on("system:user:count", (data) => {
      setUsers(data.userCount);
    });

    socket.on("quiz:question:start", (data) => {
      setQuestion(data.question);
    });

    socket.on("quiz:answer:submit", (data) => {
      console.log("Answer received:", data);
    });

    socket.on("system:error", (err) => {
      console.error("Error:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const startQuestion = () => {
    socket.emit("quiz:question:start", {
      sessionId,
      question: "What is 2 + 2?",
    });
  };

  const submitAnswer = () => {
    socket.emit("quiz:answer:submit", {
      sessionId,
      answer,
    });
    setAnswer("");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Users in room: {users}</h2>

      <button onClick={startQuestion}>Start Question (Admin)</button>

      {question && (
        <>
          <h3>{question}</h3>
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <button onClick={submitAnswer}>Submit</button>
        </>
      )}
    </div>
  );
}
