// routes/paymentRoutes.js
import express from 'express';
import {
  recordPayment,
  getPayments,
  getPayment,
  verifyPayment,
  getPaymentSummary
} from '../controllers/paymentController.js';
import { protect, authorize, requireAdminOrHR } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Summary route - accounts, admin, superadmin
router.get('/summary', 
  authorize('admin', 'superadmin', 'accounts'), 
  getPaymentSummary
);

// Get all payments - accounts, admin, superadmin
router.route('/')
  .get(authorize('admin', 'superadmin', 'accounts'), getPayments);

// Get single payment - any authenticated user
router.route('/:id')
  .get(getPayment);

// Record payment against invoice - accounts, admin, superadmin
router.post('/invoice/:invoiceId', 
  authorize('admin', 'superadmin', 'accounts'), 
  recordPayment
);

// Verify payment (clear cheque/DD) - accounts, admin, superadmin
router.patch('/:id/verify', 
  authorize('admin', 'superadmin', 'accounts'), 
  verifyPayment
);

export default router;