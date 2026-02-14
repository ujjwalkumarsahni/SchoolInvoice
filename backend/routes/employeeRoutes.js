import express from "express";
import { authenticate } from '../middleware/auth.js';
import { requireAdminOrHR } from '../middleware/profileCompletion.js';
import {createEmployee, getAllEmployees, getEmployeeById } from "../controllers/employeeController.js";

const router = express.Router();

/* ================= CREATE STUDENT ================= */

router.post('/hr/create', authenticate, requireAdminOrHR, createEmployee);
router.get('/hr/employees', authenticate, requireAdminOrHR, getAllEmployees);
router.get(
  '/hr/employees/:id',
  authenticate,
  requireAdminOrHR,
  getEmployeeById
);

export default router;
