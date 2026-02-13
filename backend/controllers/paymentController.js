import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import { addPaymentToLedger } from '../services/ledgerService.js';
import { validatePaymentAmount } from '../utils/validators.js';

/**
 * Record a payment against an invoice
 */
export const recordPayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const {
      amount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      bankDetails,
      notes
    } = req.body;
    
    // Find invoice
    const invoice = await Invoice.findById(invoiceId).populate('school');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Validate payment amount
    try {
      validatePaymentAmount(amount, invoice.balanceDue);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Create payment
    const payment = new Payment({
      invoice: invoiceId,
      school: invoice.school._id,
      amount,
      paymentDate: paymentDate || new Date(),
      paymentMethod,
      referenceNumber,
      bankDetails,
      notes,
      remainingBalance: invoice.balanceDue - amount,
      receivedBy: req.user._id,
      status: paymentMethod === 'cash' ? 'cleared' : 'pending'
    });
    
    await payment.save();
    
    // Update invoice
    invoice.paidAmount += amount;
    invoice.balanceDue = invoice.totalPayable - invoice.paidAmount;
    
    if (invoice.balanceDue <= 0) {
      invoice.status = 'paid';
      invoice.paidDate = new Date();
    }
    
    invoice.updatedBy = req.user._id;
    await invoice.save();
    
    // Add to ledger
    await addPaymentToLedger(payment, req.user._id);
    
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment,
        invoice: {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          paidAmount: invoice.paidAmount,
          balanceDue: invoice.balanceDue,
          status: invoice.status
        }
      }
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to record payment'
    });
  }
};

/**
 * Get all payments with filters
 */
export const getPayments = async (req, res) => {
  try {
    const { 
      school, 
      invoice, 
      status, 
      paymentMethod,
      startDate,
      endDate,
      page = 1, 
      limit = 10 
    } = req.query;
    
    const query = {};
    if (school) query.school = school;
    if (invoice) query.invoice = invoice;
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const payments = await Payment.find(query)
      .populate('school', 'name city')
      .populate('invoice', 'invoiceNumber month year totalPayable')
      .populate('receivedBy', 'name')
      .populate('verifiedBy', 'name')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Payment.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
};

/**
 * Get payment by ID
 */
export const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('school', 'name city contactPersonName')
      .populate('invoice')
      .populate('receivedBy', 'name email')
      .populate('verifiedBy', 'name email');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment'
    });
  }
};

/**
 * Verify payment (for cheque/DD clearance)
 */
export const verifyPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Payment already ${payment.status}`
      });
    }
    
    payment.status = 'cleared';
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    
    await payment.save();
    
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: payment
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
};

/**
 * Get payment summary
 */
export const getPaymentSummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    const matchStage = {};
    if (year) {
      const startDate = new Date(parseInt(year), month ? parseInt(month) - 1 : 0, 1);
      const endDate = month 
        ? new Date(parseInt(year), parseInt(month), 0)
        : new Date(parseInt(year) + 1, 0, 0);
      
      matchStage.paymentDate = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    const summary = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            paymentMethod: '$paymentMethod',
            status: '$status'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $group: {
          _id: '$_id.paymentMethod',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count',
              amount: '$totalAmount'
            }
          },
          totalAmount: { $sum: '$totalAmount' },
          totalCount: { $sum: '$count' }
        }
      }
    ]);
    
    const dailySummary = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
            status: '$status'
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          payments: {
            $push: {
              status: '$_id.status',
              amount: '$amount',
              count: '$count'
            }
          },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        byMethod: summary,
        daily: dailySummary
      }
    });
  } catch (error) {
    console.error('Get payment summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment summary'
    });
  }
};