import { Router } from "express";
import { validateSessionCode } from "../middlewares/session.middleware.js";
import { submitResponse } from "../controllers/response.controller.js";

const router = Router();
router.post("/", validateSessionCode, submitResponse);

export default router;
