import express from "express";
import { getEmployeeLeaves, upsertLeave } from "../../controllers/SchoolInvoice/SchoolInvoiceController.js";


const router = express.Router();

/* CREATE / UPDATE */
router.post("/", upsertLeave);

/* GET EMPLOYEE LEAVES */
router.get("/:employeeId", getEmployeeLeaves);


export default router;
    