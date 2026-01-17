import { Router } from "express";
import sessionRoutes from "./session.routes.js";
import questionRoutes from "./question.routes.js";
import responseRoutes from "./response.routes.js";
import participantRoutes from "./participant.routes.js";

const router = Router();
router.use("/sessions", sessionRoutes);
router.use("/questions", questionRoutes);
router.use("/responses", responseRoutes);
router.use("/participants", participantRoutes);

export default router;
