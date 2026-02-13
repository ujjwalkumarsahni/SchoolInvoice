import Invoice from '../models/Invoice.js';

/**
 * Check if invoice exists
 */
export const invoiceExists = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    req.invoice = invoice;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error finding invoice'
    });
  }
};

/**
 * Check if invoice can be edited
 */
export const canEditInvoice = (req, res, next) => {
  if (!req.invoice.canEdit()) {
    return res.status(403).json({
      success: false,
      message: 'Invoice cannot be edited in its current state'
    });
  }
  next();
};

/**
 * Validate invoice generation request
 */
export const validateInvoiceGeneration = (req, res, next) => {
  const { month, year } = req.body;
  
  if (!month || !year) {
    return res.status(400).json({
      success: false,
      message: 'Month and year are required'
    });
  }
  
  if (month < 1 || month > 12) {
    return res.status(400).json({
      success: false,
      message: 'Month must be between 1 and 12'
    });
  }
  
  if (year < 2000 || year > 2100) {
    return res.status(400).json({
      success: false,
      message: 'Invalid year'
    });
  }
  
  next();
};