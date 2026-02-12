import express from 'express';
import {
  createSchool,
  getSchools,
  getSchool,
  updateSchool,
  deleteSchool,
  getSchoolStats,
  getSchoolTrainers
} from '../controllers/schoolController.js';

import { authenticate } from '../middleware/auth.js'
import { requireAdminOrHR } from '../middleware/profileCompletion.js'

const router = express.Router();

router.route('/')
  .get(authenticate, getSchools)
  .post(authenticate, requireAdminOrHR, createSchool);

router.route('/dashboard/stats').get(authenticate, requireAdminOrHR, getSchoolStats);

router.route('/:id')
  .get(authenticate, getSchool)
  .put(authenticate, requireAdminOrHR, updateSchool)
  .delete(authenticate, requireAdminOrHR, deleteSchool);

router.route('/:id/trainers').get(authenticate, getSchoolTrainers);

export default router;