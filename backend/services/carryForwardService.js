import Invoice from '../models/Invoice.js';
import SchoolLedger from '../models/SchoolLedger.js';
import { getPreviousMonth } from '../utils/dateUtils.js';

/**
 * Calculate carry forward balance for a school
 */
export const calculateCarryForward = async (schoolId, currentMonth, currentYear) => {
  try {
    // Get previous month
    const { month: prevMonth, year: prevYear } = getPreviousMonth(currentMonth, currentYear);
    
    // Find previous month's invoice
    const prevInvoice = await Invoice.findOne({
      school: schoolId,
      month: prevMonth,
      year: prevYear,
      status: { $in: ['verified', 'sent', 'paid', 'overdue'] }
    });
    
    if (!prevInvoice) {
      return 0;
    }
    
    // Calculate carry forward (unpaid balance from previous month)
    const carryForward = Math.max(0, prevInvoice.balanceDue);
    
    return carryForward;
  } catch (error) {
    console.error('Error calculating carry forward:', error);
    throw error;
  }
};

/**
 * Get school's outstanding balance
 */
export const getSchoolOutstandingBalance = async (schoolId) => {
  try {
    const ledger = await SchoolLedger.findOne({ school: schoolId });
    return ledger ? ledger.currentBalance : 0;
  } catch (error) {
    console.error('Error getting school balance:', error);
    throw error;
  }
};

/**
 * Update all unpaid invoices to overdue status
 */
export const updateOverdueInvoices = async () => {
  try {
    const today = new Date();
    
    const result = await Invoice.updateMany(
      {
        dueDate: { $lt: today },
        status: { $in: ['sent', 'verified'] },
        balanceDue: { $gt: 0 }
      },
      {
        $set: { status: 'overdue' }
      }
    );
    
    console.log(`Updated ${result.modifiedCount} invoices to overdue`);
    return result;
  } catch (error) {
    console.error('Error updating overdue invoices:', error);
    throw error;
  }
};