// controllers/invoiceController.js
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import Invoice from "../models/Invoice.js";
import School from "../models/School.js";
import EmployeePosting from "../models/EmployeePosting.js";
import Leave from "../models/Leave.js";
import Holiday from "../models/Holiday.js";
import SchoolLedger from "../models/SchoolLedger.js";
import Payment from "../models/Payment.js";
import { generateInvoicePDF, sendInvoiceEmail } from "../utils/invoiceUtils.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";
import { sendPaymentReceiptEmail } from "../utils/invoiceUtils.js";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  getDaysInMonth,
  isWeekend,
  format,
  differenceInDays,
} from "date-fns";

// @desc    Auto-generate invoices for previous month
// @route   POST /api/invoices/auto-generate
// @access  Private/Admin (Called by cron job on 1st of every month)
export const autoGenerateInvoices = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { manualMonth, manualYear } = req.body || {};
    let targetMonth, targetYear;

    const currentDate = new Date();
    const today = currentDate.getDate();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // ==================== VALIDATION ====================

    if (manualMonth && manualYear) {
      // CASE 1: MANUAL MODE - Only allow previous months, NOT current or future

      // Convert to numbers to ensure proper comparison
      const reqMonth = parseInt(manualMonth);
      const reqYear = parseInt(manualYear);

      // Create comparable numbers (YYYYMM format for easy comparison)
      const requestedPeriod = reqYear * 100 + reqMonth;
      const currentPeriod = currentYear * 100 + currentMonth;
      const previousMonthDate = subMonths(currentDate, 1);
      const previousMonth = previousMonthDate.getMonth() + 1;
      const previousYear = previousMonthDate.getFullYear();
      const previousPeriod = previousYear * 100 + previousMonth;

      // Validation 1: No future months allowed
      if (requestedPeriod > currentPeriod) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Cannot generate invoice for future months. Current month: ${currentMonth}/${currentYear}`,
        });
      }

      // Validation 2: No current month allowed in manual mode
      if (requestedPeriod === currentPeriod) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Cannot generate invoice for current month (${currentMonth}/${currentYear}) in manual mode. Current month invoices are auto-generated on the 1st of next month.`,
        });
      }

      // Validation 3: Don't allow generating invoices older than 12 months (optional business rule)
      const twelveMonthsAgo = subMonths(currentDate, 12);
      const twelveMonthsAgoPeriod =
        twelveMonthsAgo.getFullYear() * 100 + (twelveMonthsAgo.getMonth() + 1);

      if (requestedPeriod < twelveMonthsAgoPeriod) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Cannot generate invoice for dates older than 12 months.`,
        });
      }

      targetMonth = reqMonth;
      targetYear = reqYear;
    } else {
      // CASE 2: AUTO MODE - Only run on 1st of month for previous month
      if (today !== 1) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message:
            "Auto-generation only runs on 1st of month. Use manual mode with month/year for other dates.",
        });
      }

      const previousMonthDate = subMonths(currentDate, 1);
      targetMonth = previousMonthDate.getMonth() + 1;
      targetYear = previousMonthDate.getFullYear();
    }

    // ==================== ADDITIONAL VALIDATION ====================
    // Double-check we're never generating for current/future months
    const targetPeriod = targetYear * 100 + targetMonth;
    const currentPeriod = currentYear * 100 + currentMonth;

    if (targetPeriod >= currentPeriod) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `System error: Attempted to generate invoice for current/future month (${targetMonth}/${targetYear}). This should not happen.`,
      });
    }

    // ==================== GET ACTIVE SCHOOLS ====================

    const schools = await School.find({ status: "active" }).session(session);

    if (!schools.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({
        success: true,
        message: "No active schools found for invoice generation",
        data: [],
      });
    }

    // ==================== DATE RANGE ====================

    const startDate = startOfMonth(new Date(targetYear, targetMonth - 1, 1));
    const endDate = endOfMonth(startDate);
    const daysInMonth = getDaysInMonth(startDate);

    // ==================== GET HOLIDAYS ====================

    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate },
    }).session(session);

    const holidaySet = new Set(
      holidays.map((h) => format(h.date, "yyyy-MM-dd")),
    );

    // ==================== CHECK FOR EXISTING INVOICES (Batch check) ====================
    const existingInvoices = await Invoice.find({
      month: targetMonth,
      year: targetYear,
      status: { $ne: "Cancelled" },
    })
      .session(session)
      .distinct("school");

    const existingSchoolIds = new Set(
      existingInvoices.map((id) => id.toString()),
    );

    // ==================== PROCESS EACH SCHOOL ====================

    const generatedInvoices = [];
    const skippedSchools = [];
    const failedSchools = [];

    for (const school of schools) {
      // Skip if invoice already exists for this period
      if (existingSchoolIds.has(school._id.toString())) {
        skippedSchools.push({
          school: school.name,
          reason: "Invoice already exists for this period",
        });
        continue;
      }

      // ✅ Start a new sub-transaction for each school
      const schoolSession = await mongoose.startSession();
      schoolSession.startTransaction();

      try {
        // ==================== GET EMPLOYEE POSTINGS ====================

        const postings = await EmployeePosting.find({
          school: school._id,
          isActive: true,
          monthlyBillingSalary: { $gt: 0 },
          $or: [
            {
              startDate: { $lte: endDate },
              $or: [{ endDate: null }, { endDate: { $gte: startDate } }],
            },
          ],
        })
          .populate({
            path: "employee",
            select: "basicInfo.fullName basicInfo.employeeId",
          })
          .session(schoolSession);

        if (!postings.length) {
          skippedSchools.push({
            school: school.name,
            reason: "No active employees",
          });
          await schoolSession.commitTransaction();
          schoolSession.endSession();
          continue;
        }

        // ==================== PROCESS EACH EMPLOYEE ====================

        const items = [];
        let subtotal = 0;
        let totalTds = 0;
        let totalGst = 0;

        for (const posting of postings) {
          if (!posting.employee) {
            console.warn(`⚠️ Posting ${posting._id} has no employee reference`);
            continue;
          }

          // Calculate billable days
          const billableStart = new Date(
            Math.max(posting.startDate.getTime(), startDate.getTime()),
          );

          const billableEnd = posting.endDate
            ? new Date(Math.min(posting.endDate.getTime(), endDate.getTime()))
            : endDate;

          if (billableStart > billableEnd) continue;

          const totalBillableDays =
            differenceInDays(billableEnd, billableStart) + 1;
          if (totalBillableDays <= 0) continue;

          // ==================== GET LEAVES ====================

          const leaves = await Leave.find({
            employee: posting.employee._id,
            status: "Approved",
            $or: [{ fromDate: { $lte: endDate }, toDate: { $gte: startDate } }],
          }).session(schoolSession);

          const leaveDaysSet = new Set();

          for (const leave of leaves) {
            const leaveStart = new Date(
              Math.max(leave.fromDate, billableStart),
            );
            const leaveEnd = new Date(Math.min(leave.toDate, billableEnd));

            for (
              let d = new Date(leaveStart);
              d <= leaveEnd;
              d.setDate(d.getDate() + 1)
            ) {
              const dateStr = format(d, "yyyy-MM-dd");
              if (!holidaySet.has(dateStr)) {
                leaveDaysSet.add(dateStr);
              }
            }
          }

          const leaveDays = leaveDaysSet.size;
          const actualWorkingDays = Math.max(0, totalBillableDays - leaveDays);

          // Calculate prorated amount
          const dailyRate = posting.monthlyBillingSalary / daysInMonth;
          const proratedAmount = Math.round(dailyRate * actualWorkingDays);

          // Calculate TDS and GST
          const tdsAmount = Math.round(
            (proratedAmount * (school.tdsPercent || 0)) / 100,
          );
          const gstAmount = Math.round(
            (proratedAmount * (school.gstPercent || 0)) / 100,
          );

          const item = {
            employee: posting.employee._id,
            employeeName: posting.employee.basicInfo?.fullName || "Unknown",
            employeeId: posting.employee.basicInfo?.employeeId || "N/A",
            monthlyBillingSalary: posting.monthlyBillingSalary,
            leaveDays,
            leaveDeduction: Math.round(dailyRate * leaveDays),
            workingDays: totalBillableDays,
            actualWorkingDays,
            proratedAmount,
            tdsPercent: school.tdsPercent || 0,
            tdsAmount,
            gstPercent: school.gstPercent || 0,
            gstAmount,
            subtotal: proratedAmount,
          };

          items.push(item);

          subtotal += proratedAmount;
          totalTds += tdsAmount;
          totalGst += gstAmount;
        }

        if (!items.length) {
          skippedSchools.push({
            school: school.name,
            reason: "No valid invoice items",
          });
          await schoolSession.commitTransaction();
          schoolSession.endSession();
          continue;
        }

        // ==================== CHECK PREVIOUS DUE (ALL PREVIOUS MONTHS) ====================

        const unpaidInvoices = await Invoice.find({
          school: school._id,
          paymentStatus: { $in: ["Unpaid", "Partial"] },
          $or: [
            { year: { $lt: targetYear } },
            { year: targetYear, month: { $lt: targetMonth } },
          ],
        }).session(schoolSession);

        let previousDue = 0;
        let previousDueBreakdown = [];

        for (const inv of unpaidInvoices) {
          const dueAmount = Math.max(0, inv.grandTotal - (inv.paidAmount || 0));

          if (dueAmount > 0) {
            previousDue += dueAmount;

            previousDueBreakdown.push({
              invoiceNumber: inv.invoiceNumber,
              month: inv.month,
              year: inv.year,
              generatedAt: inv.generatedAt,
              dueAmount,
            });
          }
        }

        // ==================== CALCULATE GRAND TOTAL ====================

        const grandTotal = subtotal - totalTds + totalGst + previousDue;

        // ==================== CREATE INVOICE ====================

        const invoiceData = {
          school: school._id,
          schoolDetails: {
            name: school.name,
            city: school.city,
            address: school.address,
            contactPersonName: school.contactPersonName,
            mobile: school.mobile,
            email: school.email,
          },
          month: targetMonth,
          year: targetYear,
          items,
          subtotal,
          previousDue,
          previousDueBreakdown,
          tdsPercent: school.tdsPercent || 0,
          tdsAmount: totalTds,
          gstPercent: school.gstPercent || 0,
          gstAmount: totalGst,
          grandTotal,
          status: "Generated",
          paymentStatus: "Unpaid",
          generatedBy: req.user?._id || null,
          generatedAt: new Date(),
          createdBy: req.user?._id || null,
        };

        const invoice = await Invoice.create([invoiceData], {
          session: schoolSession,
        });

        // ==================== UPDATE LEDGER ====================

        await SchoolLedger.create(
          [
            {
              school: school._id,
              invoice: invoice[0]._id,
              transactionType: "Invoice Generated",
              amount: grandTotal,
              balance: grandTotal,
              month: targetMonth,
              year: targetYear,
              description: `Invoice generated for ${targetMonth}/${targetYear}`,
              createdBy: req.user?._id || null,
              date: new Date(),
            },
          ],
          { session: schoolSession },
        );

        // Commit school transaction
        await schoolSession.commitTransaction();
        schoolSession.endSession();

        generatedInvoices.push(invoice[0]);
      } catch (schoolError) {
        // Rollback school transaction on error
        await schoolSession.abortTransaction();
        schoolSession.endSession();

        failedSchools.push({
          school: school.name,
          error: schoolError.message,
        });
      }
    }

    // ==================== COMMIT MAIN TRANSACTION ====================

    await session.commitTransaction();
    session.endSession();

    // ==================== SEND RESPONSE ====================

    const totalAmount = generatedInvoices.reduce(
      (sum, inv) => sum + inv.grandTotal,
      0,
    );

    const response = {
      success: true,
      message: `Invoice generation completed for ${targetMonth}/${targetYear}`,
      data: {
        generated: generatedInvoices.map((inv) => ({
          id: inv._id,
          invoiceNumber: inv.invoiceNumber,
          school: inv.schoolDetails.name,
          amount: inv.grandTotal,
          month: inv.month,
          year: inv.year,
        })),
        summary: {
          total: generatedInvoices.length,
          skipped: skippedSchools.length,
          failed: failedSchools.length,
          month: targetMonth,
          year: targetYear,
          totalAmount: totalAmount,
        },
        skipped: skippedSchools,
        failed: failedSchools,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    // Rollback main transaction
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    res.status(500).json({
      success: false,
      message: "Invoice generation failed",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// @desc    Get all invoices with filters
// @route   GET /api/invoices
// @access  Private/Admin/HR
export const getInvoices = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    school,
    month,
    year,
    paymentStatus,
    search,
  } = req.query;

  let query = {};

  if (status) query.status = status;
  if (school) query.school = school;
  if (month) query.month = parseInt(month);
  if (year) query.year = parseInt(year);
  if (paymentStatus) query.paymentStatus = paymentStatus;

  if (search) {
    const schools = await School.find({
      name: { $regex: search, $options: "i" },
    }).select("_id");

    query.$or = [
      { invoiceNumber: { $regex: search, $options: "i" } },
      { school: { $in: schools.map((s) => s._id) } },
    ];
  }

  const invoices = await Invoice.find(query)
    .populate("school", "name city address contactPersonName")
    .populate("generatedBy", "name email")
    .populate("verifiedBy", "name email")
    .populate("sentBy", "name email")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Invoice.countDocuments(query);

  res.json({
    success: true,
    data: invoices,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total,
    },
  });
});

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private/Admin/HR
export const getInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id || id === "undefined") {
    return res.status(400).json({
      success: false,
      message: "Invoice ID is required",
    });
  }

  const invoice = await Invoice.findById(id)
    .populate("school", "name city address contactPersonName mobile email")
    .populate(
      "items.employee",
      "basicInfo.fullName basicInfo.employeeId basicInfo.designation",
    )
    .populate("generatedBy", "name email")
    .populate("verifiedBy", "name email")
    .populate("sentBy", "name email")
    .populate("customizations.leaveAdjustments.adjustedBy", "name email");

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  res.json({
    success: true,
    data: invoice,
  });
});

// @desc    Verify invoice (Admin can customize before verify)
// @route   PUT /api/invoices/:id/verify
// @access  Private/Admin
// export const verifyInvoice = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const {
//     tdsPercent,
//     gstPercent,
//     items, // Modified items (with adjusted leave days)
//     leaveAdjustments,
//     notes,
//   } = req.body;

//   const invoice = await Invoice.findById(id);

//   if (!invoice) {
//     return res.status(404).json({
//       success: false,
//       message: "Invoice not found",
//     });
//   }

//   if (invoice.status !== "Generated") {
//     return res.status(400).json({
//       success: false,
//       message: `Invoice cannot be verified. Current status: ${invoice.status}`,
//     });
//   }

//   // Store original values for customization tracking
//   const originalTdsPercent = invoice.tdsPercent;
//   const originalGstPercent = invoice.gstPercent;
//   const originalItems = [...invoice.items];

//   // Apply customizations
//   if (tdsPercent !== undefined && tdsPercent !== invoice.tdsPercent) {
//     invoice.customizations.tdsAdjustment = {
//       originalPercent: originalTdsPercent,
//       adjustedPercent: tdsPercent,
//       reason: "Admin adjusted TDS",
//       adjustedBy: req.user._id,
//       adjustedAt: new Date(),
//     };
//     invoice.tdsPercent = tdsPercent;
//   }

//   if (gstPercent !== undefined && gstPercent !== invoice.gstPercent) {
//     invoice.customizations.gstAdjustment = {
//       originalPercent: originalGstPercent,
//       adjustedPercent: gstPercent,
//       reason: "Admin adjusted GST",
//       adjustedBy: req.user._id,
//       adjustedAt: new Date(),
//     };
//     invoice.gstPercent = gstPercent;
//   }

//   // Update items if provided
//   if (items && Array.isArray(items)) {
//     const leaveAdjustmentsList = [];

//     items.forEach((modifiedItem, index) => {
//       const originalItem = originalItems[index];

//       if (originalItem && modifiedItem.leaveDays !== originalItem.leaveDays) {
//         leaveAdjustmentsList.push({
//           employee: originalItem.employee,
//           originalLeaveDays: originalItem.leaveDays,
//           adjustedLeaveDays: modifiedItem.leaveDays,
//           reason: modifiedItem.reason || "Admin adjusted leave days",
//           adjustedBy: req.user._id,
//           adjustedAt: new Date(),
//         });

//         // Recalculate for this item
//         const dailyRate =
//           originalItem.monthlyBillingSalary / originalItem.workingDays;

//         const leaveDeduction = dailyRate * modifiedItem.leaveDays;
//         const actualWorkingDays =
//           originalItem.workingDays - modifiedItem.leaveDays;
//         const proratedAmount = dailyRate * actualWorkingDays;

//         invoice.items[index].leaveDays = modifiedItem.leaveDays;
//         invoice.items[index].leaveDeduction = leaveDeduction;
//         invoice.items[index].actualWorkingDays = actualWorkingDays;
//         invoice.items[index].proratedAmount = Math.round(proratedAmount);
//         invoice.items[index].subtotal = Math.round(proratedAmount);
//       }
//     });

//     invoice.customizations.leaveAdjustments = leaveAdjustmentsList;
//   }

//   // Recalculate totals
//   invoice.calculateTotals();

//   // Update invoice
//   invoice.status = "Verified";
//   invoice.verifiedBy = req.user._id;
//   invoice.verifiedAt = new Date();
//   invoice.notes = notes || invoice.notes;
//   invoice.updatedBy = req.user._id;

//   await invoice.save();

//   res.json({
//     success: true,
//     message: "Invoice verified successfully",
//     data: invoice,
//   });
// });

// @desc    Verify invoice (Admin can customize before verify)
// @route   PUT /api/invoices/:id/verify
// @access  Private/Admin
export const verifyInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    tdsPercent,
    gstPercent,
    items, // Modified items (with adjusted leave days)
    notes,
    forceReVerify = false, // New flag for re-verification
  } = req.body;

  const invoice = await Invoice.findById(id);

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  // 🟢 IMPROVED: Allow re-verification with proper checks
  const allowedStatuses = ["Generated", "Verified"]; // ✅ Now Verified is also allowed

  if (!allowedStatuses.includes(invoice.status)) {
    return res.status(400).json({
      success: false,
      message: `Invoice cannot be verified. Current status: ${invoice.status}. Allowed statuses: Generated, Verified`,
    });
  }

  // 🟢 If already verified, require forceReVerify flag
  if (invoice.status === "Verified" && !forceReVerify) {
    return res.status(400).json({
      success: false,
      message:
        "Invoice is already verified. Use forceReVerify=true to modify and re-verify",
    });
  }

  // Store original values for customization tracking
  const originalTdsPercent = invoice.tdsPercent;
  const originalGstPercent = invoice.gstPercent;
  const originalItems = [...invoice.items];

  // Track what changed
  const changes = [];

  // Apply TDS customizations
  if (tdsPercent !== undefined && tdsPercent !== invoice.tdsPercent) {
    changes.push(`TDS changed from ${originalTdsPercent}% to ${tdsPercent}%`);

    // If there was a previous adjustment, update it instead of creating new
    if (invoice.customizations.tdsAdjustment && invoice.status === "Verified") {
      invoice.customizations.tdsAdjustment.previousPercent =
        invoice.customizations.tdsAdjustment.adjustedPercent;
      invoice.customizations.tdsAdjustment.adjustedPercent = tdsPercent;
      invoice.customizations.tdsAdjustment.reason =
        "Admin re-adjusted TDS during re-verification";
      invoice.customizations.tdsAdjustment.adjustedBy = req.user._id;
      invoice.customizations.tdsAdjustment.adjustedAt = new Date();
    } else {
      invoice.customizations.tdsAdjustment = {
        originalPercent: originalTdsPercent,
        adjustedPercent: tdsPercent,
        reason: "Admin adjusted TDS",
        adjustedBy: req.user._id,
        adjustedAt: new Date(),
      };
    }
    invoice.tdsPercent = tdsPercent;
  }

  // Apply GST customizations
  if (gstPercent !== undefined && gstPercent !== invoice.gstPercent) {
    changes.push(`GST changed from ${originalGstPercent}% to ${gstPercent}%`);

    if (invoice.customizations.gstAdjustment && invoice.status === "Verified") {
      invoice.customizations.gstAdjustment.previousPercent =
        invoice.customizations.gstAdjustment.adjustedPercent;
      invoice.customizations.gstAdjustment.adjustedPercent = gstPercent;
      invoice.customizations.gstAdjustment.reason =
        "Admin re-adjusted GST during re-verification";
      invoice.customizations.gstAdjustment.adjustedBy = req.user._id;
      invoice.customizations.gstAdjustment.adjustedAt = new Date();
    } else {
      invoice.customizations.gstAdjustment = {
        originalPercent: originalGstPercent,
        adjustedPercent: gstPercent,
        reason: "Admin adjusted GST",
        adjustedBy: req.user._id,
        adjustedAt: new Date(),
      };
    }
    invoice.gstPercent = gstPercent;
  }

  // Update items if provided
  if (items && Array.isArray(items)) {
    const leaveAdjustmentsList = invoice.customizations.leaveAdjustments || [];

    items.forEach((modifiedItem, index) => {
      const originalItem = originalItems[index];

      if (originalItem && modifiedItem.leaveDays !== originalItem.leaveDays) {
        changes.push(
          `Leave days for ${originalItem.employeeName} changed from ${originalItem.leaveDays} to ${modifiedItem.leaveDays}`,
        );

        leaveAdjustmentsList.push({
          employee: originalItem.employee,
          originalLeaveDays: originalItem.leaveDays,
          adjustedLeaveDays: modifiedItem.leaveDays,
          reason:
            modifiedItem.reason ||
            (invoice.status === "Verified"
              ? "Admin re-adjusted leave days"
              : "Admin adjusted leave days"),
          adjustedBy: req.user._id,
          adjustedAt: new Date(),
        });

        // ✅ FIXED: Calculate correctly based on working days
        const daysInMonth = new Date(invoice.year, invoice.month, 0).getDate();
        const workingDays = originalItem.workingDays || daysInMonth;

        // Daily rate based on actual working days in month
        const dailyRate = originalItem.monthlyBillingSalary / workingDays;

        const leaveDeduction = dailyRate * modifiedItem.leaveDays;
        const actualWorkingDays = workingDays - modifiedItem.leaveDays;

        // ✅ CORRECT: prorated amount = monthly salary for working days - leave deduction
        // OR: daily rate × actual working days
        const proratedAmount = dailyRate * actualWorkingDays;

        invoice.items[index].leaveDays = modifiedItem.leaveDays;
        invoice.items[index].leaveDeduction = Math.round(leaveDeduction);
        invoice.items[index].actualWorkingDays = actualWorkingDays;
        invoice.items[index].proratedAmount = Math.round(proratedAmount);
        invoice.items[index].subtotal = Math.round(proratedAmount);
      }
    });

    invoice.customizations.leaveAdjustments = leaveAdjustmentsList;
  }

  // Recalculate totals
  invoice.calculateTotals();

  // 🟢 Track verification history
  if (!invoice.verificationHistory) {
    invoice.verificationHistory = [];
  }

  invoice.verificationHistory.push({
    verifiedBy: req.user._id,
    verifiedAt: new Date(),
    status: invoice.status === "Verified" ? "Re-verified" : "Verified",
    changes: changes.length > 0 ? changes : ["No changes made"],
    notes:
      notes ||
      (invoice.status === "Verified"
        ? "Re-verified invoice"
        : "Initial verification"),
  });

  // Update invoice
  invoice.status = "Verified";
  invoice.verifiedBy = req.user._id;
  invoice.verifiedAt = new Date();
  invoice.notes = notes
    ? invoice.notes
      ? `${invoice.notes}\n\n[${new Date().toLocaleDateString()}] Re-verification: ${notes}`
      : notes
    : invoice.notes;
  invoice.updatedBy = req.user._id;

  await invoice.save();

  // Populate for response
  await invoice.populate([
    { path: "verifiedBy", select: "name email" },
    { path: "verificationHistory.verifiedBy", select: "name email" },
  ]);

  const message =
    invoice.verificationHistory.length > 1
      ? "Invoice re-verified successfully"
      : "Invoice verified successfully";

  res.json({
    success: true,
    message,
    data: invoice,
    reVerification: invoice.verificationHistory.length > 1,
    changes: changes,
  });
});

// controllers/invoiceController.js - Add this new function

// @desc    Resend invoice to school (for already sent invoices)
// @route   POST /api/invoices/:id/resend
// @access  Private/Admin
export const resendInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const invoice = await Invoice.findById(id).populate("school");

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  // ✅ Allow resend for Sent and Verified invoices
  if (!["Sent", "Verified"].includes(invoice.status)) {
    return res.status(400).json({
      success: false,
      message: `Invoice cannot be resent. Current status: ${invoice.status}. Allowed: Sent, Verified`,
    });
  }

  // Check if school email exists
  if (!invoice.schoolDetails?.email && !invoice.school?.email) {
    return res.status(400).json({
      success: false,
      message: "School email not found. Cannot send invoice.",
    });
  }

  try {
    // Generate fresh PDF
    const pdfResult = await generateInvoicePDF(invoice);

    // Upload to Cloudinary (optional - update if changed)
    let pdfUrl = invoice.pdfUrl;
    let pdfPublicId = invoice.pdfPublicId;

    if (!pdfUrl || req.body.regeneratePDF) {
      const uploadResult = await uploadToCloudinary(pdfResult.base64, {
        folder: "invoices",
        public_id: `invoice_${invoice.invoiceNumber}_${Date.now()}`,
        resource_type: "raw",
      });

      pdfUrl = uploadResult.secure_url;
      pdfPublicId = uploadResult.public_id;
    }

    // Send email to school
    const emailSent = await sendInvoiceEmail(
      invoice.schoolDetails?.email || invoice.school?.email,
      invoice,
      pdfResult.buffer,
      { isResend: true }, // Flag for email template
    );

    if (emailSent) {
      // Update invoice
      invoice.status = "Sent";
      invoice.sentAt = new Date();
      invoice.sentBy = req.user._id;

      // Update PDF if new one was generated
      if (pdfUrl) {
        invoice.pdfUrl = pdfUrl;
        invoice.pdfPublicId = pdfPublicId;
      }

      // Track resend history
      if (!invoice.resendHistory) {
        invoice.resendHistory = [];
      }

      invoice.resendHistory.push({
        resentBy: req.user._id,
        resentAt: new Date(),
        reason: reason || "Resent to school",
        previousSentAt: invoice.sentAt,
      });

      await invoice.save();

      res.json({
        success: true,
        message: "Invoice resent successfully",
        data: {
          invoiceNumber: invoice.invoiceNumber,
          sentAt: invoice.sentAt,
          email: invoice.schoolDetails?.email || invoice.school?.email,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send email. Please check email configuration.",
      });
    }
  } catch (error) {
    console.error(`Error resending invoice ${invoice.invoiceNumber}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to resend invoice",
    });
  }
});

// Update sendInvoicesBulk to also track history
export const sendInvoicesBulk = asyncHandler(async (req, res) => {
  const { invoiceIds } = req.body;

  if (!invoiceIds || !invoiceIds.length) {
    return res.status(400).json({
      success: false,
      message: "Please select at least one invoice",
    });
  }

  // ✅ Allow sending both Verified and Sent invoices
  const invoices = await Invoice.find({
    _id: { $in: invoiceIds },
    status: { $in: ["Verified", "Sent"] }, // Allow both
  }).populate("school");

  if (invoices.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No verified or sent invoices found to send",
    });
  }

  const sentInvoices = [];
  const failedInvoices = [];

  for (const invoice of invoices) {
    try {
      // Generate PDF
      const pdfResult = await generateInvoicePDF(invoice);

      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(pdfResult.base64, {
        folder: "invoices",
        public_id: `invoice_${invoice.invoiceNumber}_${Date.now()}`,
        resource_type: "raw",
      });

      // Send email
      const emailSent = await sendInvoiceEmail(
        invoice.schoolDetails?.email || invoice.school?.email,
        invoice,
        pdfResult.buffer,
        { isResend: invoice.status === "Sent" }, // Flag for resend
      );

      if (emailSent) {
        const oldStatus = invoice.status;

        invoice.status = "Sent";
        invoice.sentAt = new Date();
        invoice.sentBy = req.user._id;
        invoice.pdfUrl = uploadResult.secure_url;
        invoice.pdfPublicId = uploadResult.public_id;

        // Track resend if it was already sent
        if (oldStatus === "Sent") {
          if (!invoice.resendHistory) {
            invoice.resendHistory = [];
          }
          invoice.resendHistory.push({
            resentBy: req.user._id,
            resentAt: new Date(),
            reason: "Bulk resend",
          });
        }

        await invoice.save();
        sentInvoices.push(invoice.invoiceNumber);
      } else {
        failedInvoices.push(invoice.invoiceNumber);
      }
    } catch (error) {
      console.error(`Error sending invoice ${invoice.invoiceNumber}:`, error);
      failedInvoices.push(invoice.invoiceNumber);
    }
  }

  res.json({
    success: true,
    message: `Sent ${sentInvoices.length} invoices, Failed: ${failedInvoices.length}`,
    data: {
      sent: sentInvoices,
      failed: failedInvoices,
    },
  });
});

// @desc    Get invoice statistics for dashboard
// @route   GET /api/invoices/stats
// @access  Private/Admin/HR
export const getInvoiceStats = asyncHandler(async (req, res) => {
  const { year, month } = req.query;

  const matchStage = {};
  if (year) matchStage.year = parseInt(year);
  if (month) matchStage.month = parseInt(month);

  const stats = await Invoice.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$grandTotal" },
      },
    },
  ]);

  const paymentStats = await Invoice.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$paymentStatus",
        count: { $sum: 1 },
        totalAmount: { $sum: "$grandTotal" },
        paidAmount: { $sum: "$paidAmount" },
      },
    },
  ]);

  const monthlyTrend = await Invoice.aggregate([
    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
        },
        totalAmount: { $sum: "$grandTotal" },
        count: { $sum: 1 },
        paidAmount: { $sum: "$paidAmount" },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: 12 },
  ]);

  res.json({
    success: true,
    data: {
      byStatus: stats,
      byPaymentStatus: paymentStats,
      monthlyTrend,
    },
  });
});

// @desc    Record payment for invoice
// @route   POST /api/invoices/:id/payment
// @access  Private/Admin
// controllers/invoiceController.js - Update recordPayment

export const recordPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    amount,
    paymentDate,
    paymentMethod,
    referenceNumber,
    bankName,
    branch,
    remarks,
  } = req.body;

  const invoice = await Invoice.findById(id);

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  if (invoice.paymentStatus === "Paid") {
    return res.status(400).json({
      success: false,
      message: "Invoice is already paid",
    });
  }

  // Calculate new paid amount
  const newPaidAmount = (invoice.paidAmount || 0) + Number(amount);

  if (newPaidAmount > invoice.grandTotal) {
    return res.status(400).json({
      success: false,
      message: "Payment amount exceeds invoice total",
    });
  }

  // Generate payment number
  const paymentCount = await Payment.countDocuments();
  const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(4, "0")}`;

  // Create payment record
  const payment = await Payment.create({
    paymentNumber,
    school: invoice.school,
    invoices: [invoice._id],
    amount: Number(amount),
    paymentDate: paymentDate || new Date(),
    paymentMethod: paymentMethod,
    referenceNumber: referenceNumber,
    bankName: bankName,
    branch: branch,
    remarks: remarks,
    status: "Completed",
    receivedBy: req.user._id,
    createdBy: req.user._id,
  });

  // 🟢 ADD TO PAYMENT HISTORY
  if (!invoice.paymentHistory) {
    invoice.paymentHistory = [];
  }

  invoice.paymentHistory.push({
    amount: Number(amount),
    paymentDate: paymentDate || new Date(),
    paymentMethod,
    referenceNumber,
    bankName,
    branch,
    remarks,
    receivedBy: req.user._id,
    recordedAt: new Date(),
  });

  // Update invoice
  invoice.paidAmount = newPaidAmount;
  invoice.paymentStatus =
    newPaidAmount === invoice.grandTotal ? "Paid" : "Partial";
  invoice.paidAt = new Date();
  invoice.updatedBy = req.user._id;

  await invoice.save();

  // Update ledger
  await SchoolLedger.create({
    school: invoice.school,
    invoice: invoice._id,
    transactionType: "Payment Received",
    amount: -Number(amount),
    balance: invoice.grandTotal - newPaidAmount,
    month: invoice.month,
    year: invoice.year,
    description: `Payment received for invoice ${invoice.invoiceNumber}`,
    paymentMethod: paymentMethod,
    reference: referenceNumber,
    createdBy: req.user._id,
  });

  // Send receipt email
  await sendPaymentReceiptEmail(invoice.schoolDetails.email, invoice, payment);

  res.json({
    success: true,
    message: "Payment recorded successfully",
    data: {
      invoice,
      payment,
    },
  });
});

// @desc    Download invoice PDF
// @route   GET /api/invoices/:id/download
// @access  Private/Admin/HR
export const downloadInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const invoice = await Invoice.findById(id)
    .populate("school")
    .populate("items.employee");

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  // Generate fresh PDF
  const pdfResult = await generateInvoicePDF(invoice);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice_${invoice.invoiceNumber}.pdf`,
  );
  res.send(pdfResult.buffer);
});

// @desc    Cancel invoice
// @route   PUT /api/invoices/:id/cancel
// @access  Private/Admin
export const cancelInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const invoice = await Invoice.findById(id);

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  if (invoice.status === "Paid" || invoice.status === "Sent") {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel invoice with status: ${invoice.status}`,
    });
  }

  invoice.status = "Cancelled";
  invoice.notes = `Cancelled: ${reason || "No reason provided"}`;
  invoice.updatedBy = req.user._id;

  await invoice.save();

  // Update ledger
  await SchoolLedger.create({
    school: invoice.school,
    invoice: invoice._id,
    transactionType: "Credit Note",
    amount: 0,
    balance: 0,
    description: `Invoice cancelled: ${reason || "No reason"}`,
    createdBy: req.user._id,
  });

  res.json({
    success: true,
    message: "Invoice cancelled successfully",
    data: invoice,
  });
});
