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

    const billingItems = [];

    for (const posting of postings) {
      if (!posting.employee || !posting.school) continue;

      // Calculate deployed days
      const deployedDays = calculateDeployedDays(posting, month, year);
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

      // Get monthly rate from posting (you may need to add billingRate field to EmployeePosting)
      const monthlyRate = posting.billingRate || 0; // Make sure to add this field

      // Calculate prorated amount
      const amount = calculateProratedAmount(monthlyRate, billableDays, workingDaysPerMonth);

      billingItems.push({
        employee: posting.employee._id,
        employeeName: posting.employee.user?.basicInfo?.fullName || 'Unknown',
        designation: posting.employee.user?.basicInfo?.designation || '',
        monthlyRate,
        deployedDays,
        unpaidLeaves: unpaidLeaveDays,
        billableDays,
        perDayRate: monthlyRate / workingDaysPerMonth,
        amount,
        posting: posting._id,
        joinDate: posting.startDate,
        leaveDate: posting.endDate
      });
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

    const billingItems = [];
    let subtotal = 0;

    for (const posting of postings) {
      if (!posting.employee) continue;

      const deployedDays = calculateDeployedDays(posting, month, year);
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
      const monthlyRate = posting.billingRate || 0;
      const perDayRate = monthlyRate / 26;
      const amount = Math.round(perDayRate * billableDays * 100) / 100;

      billingItems.push({
        employee: posting.employee._id,
        employeeName: posting.employee.user?.basicInfo?.fullName || 'Unknown',
        designation: posting.employee.user?.basicInfo?.designation || '',
        monthlyRate,
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
    }

    return {
      items: billingItems,
      subtotal: Math.round(subtotal * 100) / 100
    };
  } catch (error) {
    console.error('Error calculating school billing:', error);
    throw error;
  }
};