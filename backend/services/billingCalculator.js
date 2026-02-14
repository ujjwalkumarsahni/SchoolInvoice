// services/billingCalculator.js
import mongoose from 'mongoose';
import EmployeePosting from '../models/EmployeePosting.js';
import Leave from '../models/Leave.js';
import { calculateDeployedDays, calculateProratedAmount } from '../utils/dateUtils.js';

/**
 * Calculate billing for all postings in a month
 */
export const calculateMonthlyBilling = async (month, year, workingDaysPerMonth = 26) => {
  try {
    // Get all active postings for the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    
    console.log(`Calculating monthly billing for ${month}/${year}`);
    
    const postings = await EmployeePosting.find({
      $or: [
        // Postings that started before or during the month and haven't ended
        {
          startDate: { $lte: endOfMonth },
          $or: [
            { endDate: { $gte: startOfMonth } },
            { endDate: null }
          ]
        },
        // Postings that started during the month
        {
          startDate: { $gte: startOfMonth, $lte: endOfMonth }
        }
      ],
      status: { $in: ['continue', 'change_school'] }
    })
    .populate({
      path: 'employee',
      populate: {
        path: 'user',
        select: 'basicInfo.fullName basicInfo.designation'
      }
    })
    .populate('school')
    .lean();

    console.log(`Found ${postings.length} postings`);

    const billingItems = [];

    for (const posting of postings) {
      if (!posting.employee || !posting.school) {
        console.log('Skipping posting with missing employee or school:', posting._id);
        continue;
      }

      // Calculate deployed days
      const deployedDays = calculateDeployedDays(posting, month, year);
      console.log(`Posting ${posting._id}: deployedDays = ${deployedDays}`);
      
      if (deployedDays === 0) continue;

      // Get unpaid leaves for this employee at this school during the month
      const leaves = await Leave.find({
        employee: posting.employee._id,
        school: posting.school._id,
        isDeductible: true,
        startDate: { $lte: endOfMonth },
        endDate: { $gte: startOfMonth },
        status: 'approved'
      });

      // Calculate unpaid leave days overlapping with deployment
      let unpaidLeaveDays = 0;
      for (const leave of leaves) {
        const leaveStart = new Date(Math.max(leave.startDate, startOfMonth));
        const leaveEnd = new Date(Math.min(leave.endDate, endOfMonth));
        
        if (leaveStart <= leaveEnd) {
          const leaveDays = Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;
          unpaidLeaveDays += leaveDays;
        }
      }

      // Calculate billable days
      const billableDays = Math.max(0, deployedDays - unpaidLeaveDays);

      // ⭐ IMPORTANT: Use monthlyBillingSalary instead of billingRate
      const monthlyBillingSalary = posting.monthlyBillingSalary || 0;
      
      // Log warning if monthlyBillingSalary is 0
      if (monthlyBillingSalary === 0) {
        console.warn(`Warning: monthlyBillingSalary is 0 for posting ${posting._id}`);
      }

      // Calculate prorated amount
      const amount = calculateProratedAmount(monthlyBillingSalary, billableDays, workingDaysPerMonth);
      const perDayRate = workingDaysPerMonth > 0 ? monthlyBillingSalary / workingDaysPerMonth : 0;

      const employeeName = posting.employee.user?.basicInfo?.fullName || 
                          posting.employee.basicInfo?.fullName || 
                          'Unknown';
      
      const designation = posting.employee.user?.basicInfo?.designation || 
                         posting.employee.basicInfo?.designation || 
                         '';

      billingItems.push({
        employee: posting.employee._id,
        employeeName,
        designation,
        monthlyRate: monthlyBillingSalary, // Map to monthlyRate field in invoice
        deployedDays,
        unpaidLeaves: unpaidLeaveDays,
        billableDays,
        perDayRate,
        amount,
        posting: posting._id,
        joinDate: posting.startDate,
        leaveDate: posting.endDate
      });

      console.log(`Added billing item for ${employeeName}: amount=${amount}`);
    }

    return billingItems;
  } catch (error) {
    console.error('Error calculating monthly billing:', error);
    throw error;
  }
};

/**
 * Calculate billing for a single school
 */
export const calculateSchoolBilling = async (schoolId, month, year) => {
  try {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    
    console.log(`Calculating school billing for school ${schoolId}, month ${month}/${year}`);
    
    const postings = await EmployeePosting.find({
      school: schoolId,
      $or: [
        {
          startDate: { $lte: endOfMonth },
          $or: [
            { endDate: { $gte: startOfMonth } },
            { endDate: null }
          ]
        },
        {
          startDate: { $gte: startOfMonth, $lte: endOfMonth }
        }
      ],
      status: { $in: ['continue', 'change_school'] }
    })
    .populate({
      path: 'employee',
      populate: {
        path: 'user',
        select: 'basicInfo.fullName basicInfo.designation'
      }
    })
    .lean();

    console.log(`Found ${postings.length} postings for this school`);

    const billingItems = [];
    let subtotal = 0;

    for (const posting of postings) {
      if (!posting.employee) {
        console.log('Skipping posting with no employee:', posting._id);
        continue;
      }

      const deployedDays = calculateDeployedDays(posting, month, year);
      console.log(`Posting ${posting._id}: deployedDays = ${deployedDays}`);
      
      if (deployedDays === 0) continue;

      const leaves = await Leave.find({
        employee: posting.employee._id,
        school: schoolId,
        isDeductible: true,
        startDate: { $lte: endOfMonth },
        endDate: { $gte: startOfMonth },
        status: 'approved'
      });

      let unpaidLeaveDays = 0;
      for (const leave of leaves) {
        const leaveStart = new Date(Math.max(leave.startDate, startOfMonth));
        const leaveEnd = new Date(Math.min(leave.endDate, endOfMonth));
        
        if (leaveStart <= leaveEnd) {
          const leaveDays = Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;
          unpaidLeaveDays += leaveDays;
        }
      }

      const billableDays = Math.max(0, deployedDays - unpaidLeaveDays);
      
      // ⭐ IMPORTANT: Use monthlyBillingSalary instead of billingRate
      const monthlyBillingSalary = posting.monthlyBillingSalary || 0;
      
      // Log warning if monthlyBillingSalary is 0
      if (monthlyBillingSalary === 0) {
        console.warn(`Warning: monthlyBillingSalary is 0 for posting ${posting._id}`);
      }
      
      const workingDaysPerMonth = 26;
      const perDayRate = workingDaysPerMonth > 0 ? monthlyBillingSalary / workingDaysPerMonth : 0;
      const amount = Math.round(perDayRate * billableDays * 100) / 100;

      const employeeName = posting.employee.user?.basicInfo?.fullName || 
                          posting.employee.basicInfo?.fullName || 
                          'Unknown';
      
      const designation = posting.employee.user?.basicInfo?.designation || 
                         posting.employee.basicInfo?.designation || 
                         '';

      billingItems.push({
        employee: posting.employee._id,
        employeeName,
        designation,
        monthlyRate: monthlyBillingSalary, // Map to monthlyRate field in invoice
        deployedDays,
        unpaidLeaves: unpaidLeaveDays,
        billableDays,
        perDayRate,
        amount,
        posting: posting._id,
        joinDate: posting.startDate,
        leaveDate: posting.endDate
      });

      subtotal += amount;
      console.log(`Added billing item for ${employeeName}: amount=${amount}`);
    }

    const result = {
      items: billingItems,
      subtotal: Math.round(subtotal * 100) / 100
    };

    console.log(`School billing complete: subtotal=${result.subtotal}`);
    return result;
  } catch (error) {
    console.error('Error calculating school billing:', error);
    throw error;
  }
};

/**
 * Get billing summary for multiple schools
 */
export const getBillingSummary = async (month, year) => {
  try {
    const schools = await EmployeePosting.distinct('school', {
      $or: [
        {
          startDate: { $lte: new Date(year, month, 0) },
          $or: [
            { endDate: { $gte: new Date(year, month - 1, 1) } },
            { endDate: null }
          ]
        },
        {
          startDate: { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0) }
        }
      ],
      status: { $in: ['continue', 'change_school'] }
    });

    const summary = [];
    
    for (const schoolId of schools) {
      try {
        const billing = await calculateSchoolBilling(schoolId, month, year);
        if (billing.items.length > 0) {
          summary.push({
            school: schoolId,
            ...billing
          });
        }
      } catch (error) {
        console.error(`Error calculating billing for school ${schoolId}:`, error);
      }
    }

    return summary;
  } catch (error) {
    console.error('Error getting billing summary:', error);
    throw error;
  }
};