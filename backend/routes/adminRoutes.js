import express from "express";
import { createSchool,createEmployee} from "../controllers/adminController.js";
import {protect} from "../middleware/auth.js";
import {allowRoles} from "../middleware/role.js";
const router = express.Router();


router.post(
  "/school",
  protect,
  allowRoles("admin"),
  createSchool
);
router.post("/employee",createEmployee);


export default router;
