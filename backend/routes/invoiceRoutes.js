// routes/invoiceRoutes.js
import express from 'express';
import {
  generateInvoices,
  generateSchoolInvoiceController,
  getInvoices,
  getInvoice,
  updateInvoice,
  verifyInvoice,
  sendInvoices,
  cancelInvoice,
  getInvoiceStats
} from '../controllers/invoiceController.js';
import { protect, authorize, requireAdminOrHR } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected with your authenticate function
router.use(protect);

// Stats route - Anyone authenticated can view
router.get('/stats', getInvoiceStats);

// Generate invoices (admin or superadmin only)
router.post('/generate', 
  authorize('admin', 'superadmin'), 
  generateInvoices
);

// Generate invoice for specific school (admin or superadmin only)
router.post('/school/:schoolId/generate', 
  authorize('admin', 'superadmin'), 
  generateSchoolInvoiceController
);

// Bulk send invoices (admin or superadmin only)
router.patch('/send', 
  authorize('admin', 'superadmin'), 
  sendInvoices
);

// Get all invoices (with filters)
router.route('/')
  .get(getInvoices);

// Get single invoice - any authenticated user
router.route('/:id')
  .get(getInvoice);

// Update invoice (draft only) - admin, superadmin, or accounts
router.patch('/:id', 
  authorize('admin', 'superadmin', 'accounts'), 
  updateInvoice
);

// Delete/Cancel invoice (admin or superadmin only)
router.delete('/:id', 
  authorize('admin', 'superadmin'), 
  cancelInvoice
);

// Verify invoice (admin or superadmin only)
router.patch('/:id/verify', 
  authorize('admin', 'superadmin'), 
  verifyInvoice
);

export default router;