import { Router } from "express";
import { adminAuth } from "../middlewares/admin.middleware.js";

import {
  createQuestion,
  getQuestionsBySession,
  updateQuestion,
  deleteQuestion,
  duplicateQuestion,
  reorderQuestions,
  getQuestionById,
} from "../controllers/question.controller.js";

const router = Router();

/* ============================
   CREATE
============================ */
router.post("/", adminAuth, createQuestion);

/* ============================
   READ
============================ */
router.get("/session/:sessionCode", getQuestionsBySession);
router.get("/:id", getQuestionById);

/* ============================
   🔥 REORDER (MUST BE ABOVE :id)
============================ */
router.put("/reorder/all", adminAuth, reorderQuestions);

/* ============================
   UPDATE
============================ */
router.put("/:id", adminAuth, updateQuestion);

/* ============================
   DELETE
============================ */
router.delete("/:id", adminAuth, deleteQuestion);

/* ============================
   DUPLICATE
============================ */
router.post("/:id/duplicate", adminAuth, duplicateQuestion);

export default router;
