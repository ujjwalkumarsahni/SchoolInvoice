import mongoose from 'mongoose';
import SchoolLedger from '../models/SchoolLedger.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';

/**
 * Initialize ledger for a school
 */
export const initializeSchoolLedger = async (schoolId, schoolName, createdBy) => {
  try {
    const existingLedger = await SchoolLedger.findOne({ school: schoolId });
    
    if (existingLedger) {
      return existingLedger;
    }
    
    const ledger = new SchoolLedger({
      school: schoolId,
      schoolName,
      currentBalance: 0,
      entries: [],
      monthlySummary: [],
      createdBy
    });
    
    await ledger.save();
    return ledger;
  } catch (error) {
    console.error('Error initializing ledger:', error);
    throw error;
  }
};

/**
 * Add invoice entry to ledger
 */
export const addInvoiceToLedger = async (invoice, createdBy) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    let ledger = await SchoolLedger.findOne({ school: invoice.school }).session(session);
    
    if (!ledger) {
      ledger = new SchoolLedger({
        school: invoice.school,
        schoolName: invoice.schoolName,
        createdBy
      });
    }
    
    await ledger.addEntry({
      date: invoice.invoiceDate,
      entryType: 'invoice',
      referenceId: invoice._id,
      referenceModel: 'Invoice',
      referenceNumber: invoice.invoiceNumber,
      description: `Invoice for ${invoice.month}/${invoice.year}`,
      debit: invoice.totalPayable,
      credit: 0,
      month: invoice.month,
      year: invoice.year,
      metadata: {
        subtotal: invoice.subtotal,
        previousDue: invoice.previousDue
      },
      createdBy
    });
    
    await ledger.save({ session });
    await session.commitTransaction();
    
    return ledger;
  } catch (error) {
    await session.abortTransaction();
    console.error('Error adding invoice to ledger:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Add payment entry to ledger
 */
export const addPaymentToLedger = async (payment, createdBy) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const invoice = await Invoice.findById(payment.invoice).session(session);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    let ledger = await SchoolLedger.findOne({ school: payment.school }).session(session);
    
    if (!ledger) {
      ledger = new SchoolLedger({
        school: payment.school,
        schoolName: payment.schoolName || invoice.schoolName,
        createdBy
      });
    }
    
    await ledger.addEntry({
      date: payment.paymentDate,
      entryType: 'payment',
      referenceId: payment._id,
      referenceModel: 'Payment',
      referenceNumber: payment.paymentNumber,
      description: `Payment received - ${payment.paymentMethod}`,
      debit: 0,
      credit: payment.amount,
      month: payment.paymentDate.getMonth() + 1,
      year: payment.paymentDate.getFullYear(),
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber
      },
      createdBy
    });
    
    await ledger.save({ session });
    await session.commitTransaction();
    
    return ledger;
  } catch (error) {
    await session.abortTransaction();
    console.error('Error adding payment to ledger:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get school ledger with entries
 */
export const getSchoolLedger = async (schoolId, startDate, endDate) => {
  try {
    const query = { school: schoolId };
    
    const ledger = await SchoolLedger.findOne(query).populate('entries.referenceId');
    
    if (!ledger) {
      return null;
    }
    
    // Filter entries by date if provided
    if (startDate || endDate) {
      ledger.entries = ledger.entries.filter(entry => {
        const entryDate = new Date(entry.date);
        if (startDate && entryDate < startDate) return false;
        if (endDate && entryDate > endDate) return false;
        return true;
      });
    }
    
    return ledger;
  } catch (error) {
    console.error('Error getting school ledger:', error);
    throw error;
  }
};

/**
 * Get monthly summary for school
 */
export const getSchoolMonthlySummary = async (schoolId, year) => {
  try {
    const ledger = await SchoolLedger.findOne({ school: schoolId });
    
    if (!ledger) {
      return [];
    }
    
    return ledger.monthlySummary.filter(m => m.year === year);
  } catch (error) {
    console.error('Error getting monthly summary:', error);
    throw error;
  }
};