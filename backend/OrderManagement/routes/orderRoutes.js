import express from 'express';
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  updatePaymentStatus,
  dispatchOrder,
  getOrderStats,
  generateInvoice,
} from '../controllers/orderController.js';


import { authenticate } from '../middleware/auth.js';
import { requireAdminOrHR } from '../middleware/profileCompletion.js';

const router = express.Router();

// Order routes
router.route('/')
  .get(authenticate, requireAdminOrHR, getOrders)
  .post(authenticate, requireAdminOrHR, createOrder);

router.route('/dashboard/stats')
  .get(authenticate, requireAdminOrHR, getOrderStats);

router.route('/:id')
  .get(authenticate, getOrder)
  .put(authenticate, requireAdminOrHR, updateOrder)
  .delete(authenticate, requireAdminOrHR, deleteOrder);

router.route('/:id/payment')
  .patch(authenticate, requireAdminOrHR, updatePaymentStatus);

router.route('/:id/dispatch')
  .patch(authenticate, requireAdminOrHR, dispatchOrder);

router.route('/:id/invoice')
  .get(authenticate, generateInvoice);

export default router;