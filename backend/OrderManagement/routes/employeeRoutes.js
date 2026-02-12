import express from "express";
import { authenticate } from '../middleware/auth.js';
import { requireAdminOrHR } from '../middleware/profileCompletion.js';
import { bulkRegisterStudentsExcel, createEmployee, deleteEmployee, getAllEmployees, getAllStudents, getEmployeeById, getReportingManagers, registerStudent, updateEmployee } from "../controllers/employeeController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

/* ================= CREATE STUDENT ================= */

router.post('/hr/create', authenticate, requireAdminOrHR, createEmployee);
router.get('/hr/employees', authenticate, requireAdminOrHR, getAllEmployees);
router.get('/hr/employees/:id',authenticate, requireAdminOrHR, getEmployeeById);


// Update employee
router.put('/hr/employees/:id',authenticate, requireAdminOrHR, updateEmployee);

// Delete employee
router.delete('/hr/employees/:id',authenticate, requireAdminOrHR, deleteEmployee);

router.get('/reporting-managers',authenticate, requireAdminOrHR, getReportingManagers);

router.post('/students/register', authenticate, registerStudent);

router.post("/students/bulk-csv",authenticate, upload.single("file"),bulkRegisterStudentsExcel);
router.get("/students",authenticate,getAllStudents);
export default router;
