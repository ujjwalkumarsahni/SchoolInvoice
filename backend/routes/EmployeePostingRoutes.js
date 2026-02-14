// import express from 'express';
// import { createEmployeePosting, getEmployeePostings } from '../controllers/EmployeePostingController.js';

// import { authenticate } from '../middleware/auth.js'
// import { requireAdminOrHR } from '../middleware/profileCompletion.js'

// const router = express.Router();

// router.route('/')
//   .get(authenticate, requireAdminOrHR, getEmployeePostings)
//   .post(authenticate, requireAdminOrHR, createEmployeePosting);

// export default router;



import express from "express";

import {
  createEmployeePosting,
  getEmployeePostings,
  getEmployeePosting,
  updateEmployeePosting,
  getEmployeePostingHistory,
  getEmployeeCurrentStatus,
  getPostingAnalytics,
  getAllActiveEmployees,
  getActiveEmployeebyId
} from "../controllers/EmployeePostingController.js";

import { authenticate } from "../middleware/auth.js";
import { requireAdminOrHR } from "../middleware/profileCompletion.js";

const router = express.Router();


// ==============================
// POSTING CRUD
// ==============================

// Create + Get All
router.route("/")
  .get(authenticate, requireAdminOrHR, getEmployeePostings)
  .post(authenticate, requireAdminOrHR, createEmployeePosting);

// Single Posting
router.route("/:id")
  .get(authenticate, requireAdminOrHR, getEmployeePosting)
  .put(authenticate, requireAdminOrHR, updateEmployeePosting);


// ==============================
// EMPLOYEE RELATED
// ==============================

// Employee posting history
router.get(
  "/history/:employeeId",
  authenticate,
  requireAdminOrHR,
  getEmployeePostingHistory
);

// Employee current status
router.get(
  "/current/:employeeId",
  authenticate,
  requireAdminOrHR,
  getEmployeeCurrentStatus
);


// ==============================
// ANALYTICS
// ==============================

router.get(
  "/analytics/overview",
  authenticate,
  requireAdminOrHR,
  getPostingAnalytics
);


// ==============================
// ACTIVE EMPLOYEES
// ==============================

// All active employees
router.get(
  "/employees/active",
  authenticate,
  requireAdminOrHR,
  getAllActiveEmployees
);

// Active employee by ID
router.get(
  "/employees/active/:id",
  authenticate,
  requireAdminOrHR,
  getActiveEmployeebyId
);


export default router;
