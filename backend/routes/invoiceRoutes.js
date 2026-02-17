
// routes/invoiceRoutes.js
import express from 'express';
import {
  autoGenerateInvoices,
  getInvoices,
  getInvoice,
  verifyInvoice,
  sendInvoicesBulk,
  getInvoiceStats,
  recordPayment,
  downloadInvoice,
  cancelInvoice
} from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdminOrHR } from '../middleware/profileCompletion.js';

const router = express.Router();

// All routes require authentication and admin access
router.use(authenticate);
router.use(requireAdminOrHR);
// Auto-generate invoices (called by cron job)
router.post('/auto-generate', autoGenerateInvoices);

// Dashboard stats
router.get('/stats', getInvoiceStats);

// Bulk send
router.post('/send-bulk', sendInvoicesBulk);

// Invoice CRUD
router.route('/')
  .get(getInvoices);

router.route('/:id')
  .get(getInvoice)
  .delete(cancelInvoice);

// Verify invoice
router.put('/:id/verify', verifyInvoice);

// Download PDF
router.get('/:id/download', downloadInvoice);

// Record payment
router.post('/:id/payment', recordPayment);

export default router;