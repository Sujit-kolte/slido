import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import routes from "./routes/routes.js";
import errorHandler from "./middlewares/error.middleware.js";

const app = express();

// 🟢 CRITICAL FIX FOR RENDER
// This tells Express to trust the Load Balancer so Rate Limit works correctly
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: "*" }));

// ✅ EVENT SAFE RATE LIMIT
// Now this will work because we trusted the proxy above
app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // ~500 users safe
    message: "Too many requests, try again shortly",
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({ message: "GDG Slido Backend with WebSockets" });
});

app.use(errorHandler);
export default app;
