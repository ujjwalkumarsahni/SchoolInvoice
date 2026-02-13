/**
 * Date utility functions for invoice calculations
 */

/**
 * Get deployed days for an employee in a given month
 * @param {Object} posting - Employee posting document
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {number} - Number of deployed days
 */
export const calculateDeployedDays = (posting, month, year) => {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0); // Last day of month
  
  const postingStart = posting.startDate ? new Date(posting.startDate) : startOfMonth;
  const postingEnd = posting.endDate || endOfMonth;
  
  // Clip to month boundaries
  const effectiveStart = postingStart > startOfMonth ? postingStart : startOfMonth;
  const effectiveEnd = postingEnd < endOfMonth ? postingEnd : endOfMonth;
  
  // If no overlap with month
  if (effectiveStart > endOfMonth || effectiveEnd < startOfMonth) {
    return 0;
  }
  
  // Calculate days (inclusive of both start and end)
  const days = Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(0, days);
};

/**
 * Calculate prorated amount based on deployed days
 * @param {number} monthlyRate - Monthly billing rate
 * @param {number} deployedDays - Number of deployed days
 * @param {number} workingDaysPerMonth - Working days per month (default: 26)
 * @returns {number} - Prorated amount
 */
export const calculateProratedAmount = (monthlyRate, deployedDays, workingDaysPerMonth = 26) => {
  const perDayRate = monthlyRate / workingDaysPerMonth;
  return Math.round(perDayRate * deployedDays * 100) / 100; // Round to 2 decimals
};

/**
 * Get month name from month number
 * @param {number} month - Month (1-12)
 * @returns {string} - Month name
 */
export const getMonthName = (month) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1];
};

/**
 * Get date range for a month
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Object} - Start and end dates
 */
export const getMonthDateRange = (month, year) => {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0) // Last day of month
  };
};

/**
 * Check if date falls within a month
 * @param {Date} date - Date to check
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {boolean}
 */
export const isDateInMonth = (date, month, year) => {
  const d = new Date(date);
  return d.getMonth() + 1 === month && d.getFullYear() === year;
};

/**
 * Calculate due date (30 days from invoice date)
 * @param {Date} invoiceDate - Invoice date
 * @returns {Date} - Due date
 */
export const calculateDueDate = (invoiceDate) => {
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 30);
  return dueDate;
};

/**
 * Get previous month and year
 * @param {number} month - Current month
 * @param {number} year - Current year
 * @returns {Object} - Previous month and year
 */
export const getPreviousMonth = (month, year) => {
  if (month === 1) {
    return { month: 12, year: year - 1 };
  }
  return { month: month - 1, year };
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
};