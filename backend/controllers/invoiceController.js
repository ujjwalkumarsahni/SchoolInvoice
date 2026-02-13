import Invoice from '../models/Invoice.js';
import { generateAllInvoices, generateSchoolInvoice, getInvoiceById } from '../services/invoiceGenerationService.js';
import { addInvoiceToLedger } from '../services/ledgerService.js';
import { validateInvoiceEdit } from '../utils/validators.js';

/**
 * Generate invoices for all schools
 */
export const generateInvoices = async (req, res) => {
  try {
    const { month, year } = req.body;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }
    
    const results = await generateAllInvoices(month, year, req.user._id);
    
    res.status(200).json({
      success: true,
      message: 'Invoice generation completed',
      data: results
    });
  } catch (error) {
    console.error('Generate invoices error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate invoices'
    });
  }
};

/**
 * Generate invoice for a specific school
 */
export const generateSchoolInvoiceController = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { month, year } = req.body;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }
    
    const invoice = await generateSchoolInvoice(schoolId, month, year, req.user._id);
    
    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Generate school invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate invoice'
    });
  }
};

/**
 * Get all invoices with filters
 */
export const getInvoices = async (req, res) => {
  try {
    const { status, school, month, year, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (school) query.school = school;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const invoices = await Invoice.find(query)
      .populate('school', 'name city')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Invoice.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices'
    });
  }
};

/**
 * Get single invoice by ID
 */
export const getInvoice = async (req, res) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice'
    });
  }
};

/**
 * Update invoice (draft only)
 */
export const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Validate edit permissions
    try {
      validateInvoiceEdit(invoice);
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    // Update allowed fields
    const allowedUpdates = ['notes', 'terms', 'dueDate'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        invoice[field] = req.body[field];
      }
    });
    
    invoice.updatedBy = req.user._id;
    await invoice.save();
    
    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice'
    });
  }
};

/**
 * Verify invoice
 */
export const verifyInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    if (invoice.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Cannot verify invoice with status: ${invoice.status}`
      });
    }
    
    invoice.status = 'verified';
    invoice.verifiedBy = req.user._id;
    invoice.verifiedAt = new Date();
    invoice.updatedBy = req.user._id;
    
    await invoice.save();
    
    // Update ledger
    await addInvoiceToLedger(invoice, req.user._id);
    
    res.status(200).json({
      success: true,
      message: 'Invoice verified successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Verify invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify invoice'
    });
  }
};

/**
 * Send invoice (bulk or single)
 */
export const sendInvoices = async (req, res) => {
  try {
    const { invoiceIds } = req.body;
    
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice IDs are required'
      });
    }
    
    const result = await Invoice.updateMany(
      {
        _id: { $in: invoiceIds },
        status: 'verified'
      },
      {
        $set: {
          status: 'sent',
          sentDate: new Date(),
          updatedBy: req.user._id,
          isLocked: true
        }
      }
    );
    
    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} invoices sent successfully`,
      data: result
    });
  } catch (error) {
    console.error('Send invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invoices'
    });
  }
};

/**
 * Cancel invoice
 */
export const cancelInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel paid invoice'
      });
    }
    
    invoice.status = 'cancelled';
    invoice.isLocked = true;
    invoice.updatedBy = req.user._id;
    await invoice.save();
    
    res.status(200).json({
      success: true,
      message: 'Invoice cancelled successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Cancel invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel invoice'
    });
  }
};

/**
 * Get invoice statistics
 */
export const getInvoiceStats = async (req, res) => {
  try {
    const stats = await Invoice.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalPayable' },
          totalPaid: { $sum: '$paidAmount' },
          totalDue: { $sum: '$balanceDue' }
        }
      }
    ]);
    
    const totalStats = await Invoice.aggregate([
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$totalPayable' },
          totalPaid: { $sum: '$paidAmount' },
          totalDue: { $sum: '$balanceDue' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        totals: totalStats[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalDue: 0
        }
      }
    });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice statistics'
    });
  }
};