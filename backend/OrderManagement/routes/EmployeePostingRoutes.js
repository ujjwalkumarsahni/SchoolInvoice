import express from 'express';
import { createEmployeePosting, getEmployeePostings } from '../controllers/EmployeePostingController.js';

import { authenticate } from '../middleware/auth.js'
import { requireAdminOrHR } from '../middleware/profileCompletion.js'

const router = express.Router();

router.route('/')
  .get(authenticate, requireAdminOrHR, getEmployeePostings)
  .post(authenticate, requireAdminOrHR, createEmployeePosting);

export default router;