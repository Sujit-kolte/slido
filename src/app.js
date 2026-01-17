import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import routes from "./routes/routes.js";
import errorHandler from "./middlewares/error.middleware.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: "*"}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));

app.use(express.json({ limit: "10kb" }));
app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({ message: "GDG Slido Backend with WebSockets" });
});

app.use(errorHandler);
export default app;
