import express from "express";
import { getStudents } from "../controllers/studentController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get(
  "/",
  protect,
  getStudents
);


export default router;
