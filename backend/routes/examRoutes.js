import express from "express";
import {addQuestion, createExam, getExams} from "../controllers/examController.js";
import {protect} from "../middleware/auth.js";
import {allowRoles} from "../middleware/role.js";

const router = express.Router();

router.post("/create",protect,allowRoles("employee"),createExam);
router.post("/questions/create",protect,allowRoles("employee"),addQuestion);
router.get(
  "/questions",
  protect,
  allowRoles("admin","employee"),
  getExams
);
export default router;
