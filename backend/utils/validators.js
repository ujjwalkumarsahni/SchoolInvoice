import Invoice from '../models/Invoice.js';

/**
 * Validate if invoice can be generated for school in month
 */
export const validateInvoiceGeneration = async (schoolId, month, year) => {
  // Check for existing invoice
  const existingInvoice = await Invoice.findOne({
    school: schoolId,
    month,
    year,
    status: { $ne: 'cancelled' }
  });
  
  if (existingInvoice) {
    throw new Error(`Invoice already exists for this school in ${month}/${year}`);
  }
  
  return true;
};

/**
 * Validate posting dates for billing
 */
export const validatePostingForBilling = (posting, month, year) => {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  
  const postingStart = new Date(posting.startDate);
  const postingEnd = posting.endDate ? new Date(posting.endDate) : null;
  
  // Check if posting overlaps with month
  if (postingStart > endOfMonth) {
    throw new Error('Posting starts after month end');
  }
  
  if (postingEnd && postingEnd < startOfMonth) {
    throw new Error('Posting ended before month start');
  }
  
  return true;
};

/**
 * Validate invoice edit permissions
 */
export const validateInvoiceEdit = (invoice) => {
  if (invoice.isLocked) {
    throw new Error('Cannot edit locked invoice');
  }
  
  if (invoice.status === 'paid') {
    throw new Error('Cannot edit paid invoice');
  }
  
  if (invoice.status === 'sent') {
    throw new Error('Cannot edit sent invoice');
  }
  
  return true;
};

/**
 * Validate payment amount
 */
export const validatePaymentAmount = (amount, maxAmount) => {
  if (amount <= 0) {
    throw new Error('Payment amount must be greater than 0');
  }
  
  if (amount > maxAmount) {
    throw new Error(`Payment amount cannot exceed ${maxAmount}`);
  }
  
  return true;
};