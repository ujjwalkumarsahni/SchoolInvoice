import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import School from '../models/School.js';
import { calculateSchoolBilling } from './billingCalculator.js';
import { calculateCarryForward } from './carryForwardService.js';
import { addInvoiceToLedger } from './ledgerService.js';
import { validateInvoiceGeneration } from '../utils/validators.js';
import { calculateDueDate, getMonthName } from '../utils/dateUtils.js';

/**
 * Generate invoice for a single school
 */
export const generateSchoolInvoice = async (schoolId, month, year, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Validate no existing invoice
    await validateInvoiceGeneration(schoolId, month, year);
    
    // Get school details
    const school = await School.findById(schoolId);
    if (!school) {
      throw new Error('School not found');
    }
    
    // Calculate billing for the month
    const billing = await calculateSchoolBilling(schoolId, month, year);
    
    if (billing.items.length === 0) {
      throw new Error('No billable employees for this month');
    }
    
    // Calculate carry forward from previous month
    const previousDue = await calculateCarryForward(schoolId, month, year);
    
    // Calculate totals
    const subtotal = billing.subtotal;
    const totalPayable = subtotal + previousDue;
    
    // Create invoice
    const invoice = new Invoice({
      school: schoolId,
      schoolName: school.name,
      month,
      year,
      items: billing.items,
      subtotal,
      previousDue,
      totalPayable,
      paidAmount: 0,
      balanceDue: totalPayable,
      status: 'draft',
      invoiceDate: new Date(),
      dueDate: calculateDueDate(new Date()),
      createdBy: userId,
      isLocked: false
    });
    
    await invoice.save({ session });
    
    // Add to ledger
    await addInvoiceToLedger(invoice, userId);
    
    await session.commitTransaction();
    
    return invoice;
  } catch (error) {
    await session.abortTransaction();
    console.error('Error generating school invoice:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Generate invoices for all active schools
 */
export const generateAllInvoices = async (month, year, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Get all active schools
    const schools = await School.find({ status: 'active' }).select('_id name');
    
    const results = {
      successful: [],
      failed: []
    };
    
    for (const school of schools) {
      try {
        // Check for existing invoice
        const existing = await Invoice.findOne({
          school: school._id,
          month,
          year,
          status: { $ne: 'cancelled' }
        });
        
        if (existing) {
          results.failed.push({
            school: school.name,
            reason: 'Invoice already exists'
          });
          continue;
        }
        
        // Generate invoice
        const invoice = await generateSchoolInvoice(school._id, month, year, userId);
        
        results.successful.push({
          school: school.name,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalPayable
        });
      } catch (error) {
        results.failed.push({
          school: school.name,
          reason: error.message
        });
      }
    }
    
    await session.commitTransaction();
    
    return results;
  } catch (error) {
    await session.abortTransaction();
    console.error('Error generating all invoices:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get invoice by ID with populated fields
 */
export const getInvoiceById = async (invoiceId) => {
  try {
    return await Invoice.findById(invoiceId)
      .populate('school', 'name city address contactPersonName mobile email')
      .populate('items.employee', 'basicInfo.fullName basicInfo.employeeId')
      .populate('verifiedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
  } catch (error) {
    console.error('Error getting invoice:', error);
    throw error;
  }
};

/**
 * Get invoices for a school
 */
export const getSchoolInvoices = async (schoolId, filters = {}) => {
  try {
    const query = { school: schoolId };
    
    if (filters.status) query.status = filters.status;
    if (filters.month) query.month = filters.month;
    if (filters.year) query.year = filters.year;
    
    return await Invoice.find(query)
      .sort({ createdAt: -1 })
      .populate('verifiedBy', 'name email')
      .populate('createdBy', 'name email');
  } catch (error) {
    console.error('Error getting school invoices:', error);
    throw error;
  }
};

/**
 * Get pending invoices (unpaid)
 */
export const getPendingInvoices = async () => {
  try {
    return await Invoice.find({
      status: { $in: ['verified', 'sent', 'overdue'] },
      balanceDue: { $gt: 0 }
    })
      .populate('school', 'name city contactPersonName mobile email')
      .sort({ dueDate: 1 });
  } catch (error) {
    console.error('Error getting pending invoices:', error);
    throw error;
  }
};