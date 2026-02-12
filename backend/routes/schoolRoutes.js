import express from "express";
import { protect } from "../middleware/auth.js";
import { getSchools } from "../controllers/schoolController.js";

const router = express.Router();

router.get(
  "/",
  protect,
  getSchools
);

export default router;
