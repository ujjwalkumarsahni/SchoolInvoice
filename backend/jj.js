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
import { startOfMonth, endOfMonth, subMonths, getDaysInMonth, isWeekend, format, differenceInDays } from "date-fns";

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
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();

    // ==================== VALIDATION ====================
    
    // CASE 1: Manual generation (Admin forcing generation for specific month)
    if (manualMonth && manualYear) {
      // Manual mode can only generate previous month's invoice
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      
      if (manualMonth !== prevMonth || manualYear !== prevYear) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `You can only generate invoice for previous month: ${prevMonth}/${prevYear}`,
        });
      }
      
      targetMonth = manualMonth;
      targetYear = manualYear;
    }
    
    // CASE 2: Auto generation (Cron job - should only run on 1st)
    else {
      // Auto mode should only run on 1st of month
      if (today !== 1) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Auto-generation only runs on 1st of month. Use manual mode for other dates.",
        });
      }
      
      // Calculate previous month using date-fns (safer)
      const previousMonthDate = subMonths(currentDate, 1);
      targetMonth = previousMonthDate.getMonth() + 1; // 1-12
      targetYear = previousMonthDate.getFullYear();
    }

    console.log(`🚀 Generating invoices for: Month ${targetMonth}, Year ${targetYear}`);

    // ==================== GET ACTIVE SCHOOLS ====================
    
    const schools = await School.find({ 
      status: "active",
      // Optional: Only schools with active trainers
      // currentTrainers: { $exists: true, $ne: [] }
    }).session(session);

    if (!schools.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({
        success: true,
        message: "No active schools found for invoice generation",
        data: [],
      });
    }

    // ==================== DATE RANGE FOR TARGET MONTH ====================
    
    const startDate = startOfMonth(new Date(targetYear, targetMonth - 1, 1));
    const endDate = endOfMonth(startDate);
    const daysInMonth = getDaysInMonth(startDate);
    
    console.log(`📅 Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')} (${daysInMonth} days)`);

    // ==================== GET ALL HOLIDAYS FOR THE MONTH ====================
    
    const holidays = await Holiday.find({
      date: { 
        $gte: startDate, 
        $lte: endDate 
      },
    }).session(session);

    const holidaySet = new Set(
      holidays.map(h => format(h.date, 'yyyy-MM-dd'))
    );
    
    console.log(`🎉 Total holidays: ${holidaySet.size}`);

    // ==================== PROCESS EACH SCHOOL ====================
    
    const generatedInvoices = [];
    const skippedSchools = [];
    const failedSchools = [];

    for (const school of schools) {
      try {
        // Check if invoice already exists for this school/month/year
        const existingInvoice = await Invoice.findOne({
          school: school._id,
          month: targetMonth,
          year: targetYear,
          status: { $ne: "Cancelled" } // Don't regenerate if cancelled
        }).session(session);

        if (existingInvoice) {
          console.log(`⏭️ Invoice already exists for ${school.name}`);
          skippedSchools.push({
            school: school.name,
            reason: "Invoice already exists"
          });
          continue;
        }

        // ==================== GET ACTIVE EMPLOYEE POSTINGS ====================
        
        const postings = await EmployeePosting.find({
          school: school._id,
          isActive: true,
          monthlyBillingSalary: { $gt: 0 }, // Only those with valid billing rate
          $or: [
            { 
              startDate: { $lte: endDate },
              $or: [
                { endDate: null },
                { endDate: { $gte: startDate } }
              ]
            }
          ]
        })
        .populate({
          path: "employee",
          select: "basicInfo.fullName basicInfo.employeeId basicInfo.designation",
        })
        .session(session);

        if (!postings.length) {
          console.log(`⏭️ No active employees for ${school.name}`);
          skippedSchools.push({
            school: school.name,
            reason: "No active employees"
          });
          continue;
        }

        console.log(`👥 Processing ${school.name} - ${postings.length} employees`);

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

          // Calculate billable days for this employee in the month
          const billableStart = new Date(Math.max(
            posting.startDate.getTime(),
            startDate.getTime()
          ));
          
          const billableEnd = posting.endDate 
            ? new Date(Math.min(posting.endDate.getTime(), endDate.getTime()))
            : endDate;

          // If no overlap with month, skip
          if (billableStart > billableEnd) {
            continue;
          }

          // Calculate total billable days (including weekends)
          const totalBillableDays = differenceInDays(billableEnd, billableStart) + 1;
          
          if (totalBillableDays <= 0) continue;

          // ==================== GET APPROVED LEAVES ====================
          
          const leaves = await Leave.find({
            employee: posting.employee._id,
            status: "Approved",
            $or: [
              {
                fromDate: { $lte: endDate },
                toDate: { $gte: startDate }
              }
            ]
          }).session(session);

          // Calculate leave days (excluding holidays)
          const leaveDaysSet = new Set();
          
          for (const leave of leaves) {
            const leaveStart = new Date(Math.max(leave.fromDate, billableStart));
            const leaveEnd = new Date(Math.min(leave.toDate, billableEnd));
            
            // Iterate through each day of leave
            for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
              const dateStr = format(d, 'yyyy-MM-dd');
              
              // Don't count as leave if it's a holiday
              if (!holidaySet.has(dateStr)) {
                leaveDaysSet.add(dateStr);
              }
            }
          }

          const leaveDays = leaveDaysSet.size;
          
          // Calculate working days (billable days - leaves)
          // Note: Weekends are already included in billable days
          const actualWorkingDays = Math.max(0, totalBillableDays - leaveDays);
          
          // Calculate prorated amount
          const dailyRate = posting.monthlyBillingSalary / daysInMonth;
          const proratedAmount = Math.round(dailyRate * actualWorkingDays);

          // Calculate TDS and GST (school level rates)
          const tdsAmount = Math.round((proratedAmount * (school.tdsPercent || 0)) / 100);
          const gstAmount = Math.round((proratedAmount * (school.gstPercent || 0)) / 100);

          // Create item
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

        // If no valid items after processing, skip
        if (!items.length) {
          console.log(`⏭️ No valid invoice items for ${school.name}`);
          skippedSchools.push({
            school: school.name,
            reason: "No valid invoice items"
          });
          continue;
        }

        // ==================== CHECK FOR PREVIOUS DUE ====================
        
        const previousDueInvoice = await Invoice.findOne({
          school: school._id,
          paymentStatus: { $in: ["Unpaid", "Partial"] },
          grandTotal: { $gt: 0 }
        })
        .sort({ createdAt: -1 })
        .session(session);

        let previousDue = 0;
        if (previousDueInvoice) {
          previousDue = Math.max(
            0,
            previousDueInvoice.grandTotal - (previousDueInvoice.paidAmount || 0)
          );
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
          previousDue, // Add this to schema if not exists
          tdsPercent: school.tdsPercent || 0,
          tdsAmount: totalTds,
          gstPercent: school.gstPercent || 0,
          gstAmount: totalGst,
          grandTotal,
          status: "Generated",
          paymentStatus: previousDue > 0 ? "Partial" : "Unpaid",
          generatedBy: req.user?._id || null,
          generatedAt: new Date(),
          createdBy: req.user?._id || null,
        };

        const invoice = await Invoice.create([invoiceData], { session });

        // ==================== UPDATE LEDGER ====================
        
        await SchoolLedger.create([{
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
        }], { session });

        generatedInvoices.push(invoice[0]);
        console.log(`✅ Invoice generated for ${school.name}: ${invoice[0].invoiceNumber} - ₹${grandTotal}`);

      } catch (schoolError) {
        console.error(`❌ Error processing school ${school.name}:`, schoolError);
        failedSchools.push({
          school: school.name,
          error: schoolError.message
        });
        // Continue with next school, don't break the loop
      }
    }

    // ==================== COMMIT TRANSACTION ====================
    
    await session.commitTransaction();
    session.endSession();

    // ==================== SEND RESPONSE ====================
    
    const response = {
      success: true,
      message: `Invoice generation completed`,
      data: {
        generated: generatedInvoices.map(inv => ({
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
        },
        skipped: skippedSchools,
        failed: failedSchools,
      },
    };

    // Log summary
    console.log("\n========== INVOICE GENERATION SUMMARY ==========");
    console.log(`✅ Generated: ${generatedInvoices.length} invoices`);
    console.log(`⏭️ Skipped: ${skippedSchools.length} schools`);
    console.log(`❌ Failed: ${failedSchools.length} schools`);
    console.log(`💰 Total Amount: ₹${generatedInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0)}`);
    console.log("================================================\n");

    res.status(201).json(response);

  } catch (error) {
    // ==================== ROLLBACK ON ERROR ====================
    
    await session.abortTransaction();
    session.endSession();
    
    console.error("❌ Invoice generation failed:", error);
    
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
export const verifyInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    tdsPercent,
    gstPercent,
    items, // Modified items (with adjusted leave days)
    leaveAdjustments,
    notes,
  } = req.body;

  const invoice = await Invoice.findById(id);

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  if (invoice.status !== "Generated") {
    return res.status(400).json({
      success: false,
      message: `Invoice cannot be verified. Current status: ${invoice.status}`,
    });
  }

  // Store original values for customization tracking
  const originalTdsPercent = invoice.tdsPercent;
  const originalGstPercent = invoice.gstPercent;
  const originalItems = [...invoice.items];

  // Apply customizations
  if (tdsPercent !== undefined && tdsPercent !== invoice.tdsPercent) {
    invoice.customizations.tdsAdjustment = {
      originalPercent: originalTdsPercent,
      adjustedPercent: tdsPercent,
      reason: "Admin adjusted TDS",
      adjustedBy: req.user._id,
      adjustedAt: new Date(),
    };
    invoice.tdsPercent = tdsPercent;
  }

  if (gstPercent !== undefined && gstPercent !== invoice.gstPercent) {
    invoice.customizations.gstAdjustment = {
      originalPercent: originalGstPercent,
      adjustedPercent: gstPercent,
      reason: "Admin adjusted GST",
      adjustedBy: req.user._id,
      adjustedAt: new Date(),
    };
    invoice.gstPercent = gstPercent;
  }

  // Update items if provided
  if (items && Array.isArray(items)) {
    const leaveAdjustmentsList = [];

    items.forEach((modifiedItem, index) => {
      const originalItem = originalItems[index];

      if (originalItem && modifiedItem.leaveDays !== originalItem.leaveDays) {
        leaveAdjustmentsList.push({
          employee: originalItem.employee,
          originalLeaveDays: originalItem.leaveDays,
          adjustedLeaveDays: modifiedItem.leaveDays,
          reason: modifiedItem.reason || "Admin adjusted leave days",
          adjustedBy: req.user._id,
          adjustedAt: new Date(),
        });

        // Recalculate for this item
        const dailyRate =
          originalItem.monthlyBillingSalary / originalItem.workingDays;

        const leaveDeduction = dailyRate * modifiedItem.leaveDays;
        const actualWorkingDays =
          originalItem.workingDays - modifiedItem.leaveDays;
        const proratedAmount = dailyRate * actualWorkingDays;

        invoice.items[index].leaveDays = modifiedItem.leaveDays;
        invoice.items[index].leaveDeduction = leaveDeduction;
        invoice.items[index].actualWorkingDays = actualWorkingDays;
        invoice.items[index].proratedAmount = Math.round(proratedAmount);
        invoice.items[index].subtotal = Math.round(proratedAmount);
      }
    });

    invoice.customizations.leaveAdjustments = leaveAdjustmentsList;
  }

  // Recalculate totals
  invoice.calculateTotals();

  // Update invoice
  invoice.status = "Verified";
  invoice.verifiedBy = req.user._id;
  invoice.verifiedAt = new Date();
  invoice.notes = notes || invoice.notes;
  invoice.updatedBy = req.user._id;

  await invoice.save();

  res.json({
    success: true,
    message: "Invoice verified successfully",
    data: invoice,
  });
});

// @desc    Send invoices to schools (bulk)
// @route   POST /api/invoices/send-bulk
// @access  Private/Admin
export const sendInvoicesBulk = asyncHandler(async (req, res) => {
  const { invoiceIds } = req.body;

  if (!invoiceIds || !invoiceIds.length) {
    return res.status(400).json({
      success: false,
      message: "Please select at least one invoice",
    });
  }

  const invoices = await Invoice.find({
    _id: { $in: invoiceIds },
    status: "Verified",
  }).populate("school");

  if (invoices.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No verified invoices found to send",
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
        public_id: `invoice_${invoice.invoiceNumber}`,
        resource_type: "raw",
      });

      // Update invoice with PDF URL
      invoice.pdfUrl = uploadResult.secure_url;
      invoice.pdfPublicId = uploadResult.public_id;

      // Send email to school
      const emailSent = await sendInvoiceEmail(
        invoice.school.email,
        invoice,
        pdfResult.buffer,
      );

      if (emailSent) {
        invoice.status = "Sent";
        invoice.sentAt = new Date();
        invoice.sentBy = req.user._id;
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
  const newPaidAmount = (invoice.paidAmount || 0) + amount;

  if (newPaidAmount > invoice.grandTotal) {
    return res.status(400).json({
      success: false,
      message: "Payment amount exceeds invoice total",
    });
  }

  // Generate payment number
  const paymentCount = await Payment.countDocuments();

  const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(4, "0")}`;

  const payment = await Payment.create({
    paymentNumber,

    school: invoice.school,
    invoices: [invoice._id],
    amount: amount,
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
    amount: -amount, // Negative for credit
    balance: invoice.grandTotal - newPaidAmount,
    month: invoice.month,
    year: invoice.year,
    description: `Payment received for invoice ${invoice.invoiceNumber}`,
    paymentMethod: paymentMethod,
    reference: referenceNumber,
    createdBy: req.user._id,
  });

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


// services/invoiceService.js
import api from './api'; // Aapka existing API service

const invoiceService = {
  // Get all invoices with filters
  getInvoices: (params) => api.get('/invoices', { params }),
  
  // Get single invoice
  getInvoice: (id) => api.get(`/invoices/${id}`),
  
  // Get invoice stats
  getStats: (params) => api.get('/invoices/stats', { params }),
  
  // Auto-generate invoices
  autoGenerate: (data) => api.post('/invoices/auto-generate',data),
  
  // Verify invoice
  verifyInvoice: (id, data) => api.put(`/invoices/${id}/verify`, data),
  
  // Bulk send invoices
  sendBulk: (invoiceIds) => api.post('/invoices/send-bulk', { invoiceIds }),
  
  // Record payment
  recordPayment: (id, data) => api.post(`/invoices/${id}/payment`, data),
  
  // Download invoice PDF
  downloadInvoice: (id) => api.get(`/invoices/${id}/download`, {
    responseType: 'blob'
  }),
  
  // Cancel invoice
  cancelInvoice: (id, reason) => api.delete(`/invoices/${id}`, { data: { reason } })
};

export default invoiceService;


// routes/invoiceRoutes.js
import express from 'express';
import {
  autoGenerateInvoices,
  getInvoices,
  getInvoice,
  verifyInvoice,
  sendInvoicesBulk,
  getInvoiceStats,
  recordPayment,
  downloadInvoice,
  cancelInvoice
} from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdminOrHR } from '../middleware/profileCompletion.js';

const router = express.Router();

// All routes require authentication and admin access
router.use(authenticate);
router.use(requireAdminOrHR);
// Auto-generate invoices (called by cron job)
router.post('/auto-generate', autoGenerateInvoices);

// Dashboard stats
router.get('/stats', getInvoiceStats);

// Bulk send
router.post('/send-bulk', sendInvoicesBulk);

// Invoice CRUD
router.route('/')
  .get(getInvoices);

router.route('/:id')
  .get(getInvoice)
  .delete(cancelInvoice);

// Verify invoice
router.put('/:id/verify', verifyInvoice);

// Download PDF
router.get('/:id/download', downloadInvoice);

// Record payment
router.post('/:id/payment', recordPayment);

export default router;

import mongoose from "mongoose";

const schoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "School name is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    contactPersonName: {
      type: String,
      required: [true, "Contact person name is required"],
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: "Mobile number must be 10 digits",
      },
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    tdsPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    gstPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    trainersRequired: {
      type: Number,
      required: [true, "Number of trainers required is needed"],
      min: [1, "At least 1 trainer is required"],
      default: 1,
    },
    currentTrainers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],
    logo: {
      url: String,
      public_id: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Virtual for current trainers count
schoolSchema.virtual("trainersCount").get(function () {
  return this.currentTrainers.length;
});

// Virtual for trainer status
schoolSchema.virtual("trainerStatus").get(function () {
  const count = this.currentTrainers.length;
  const required = this.trainersRequired;

  if (count >= required) return "adequate";
  if (count > 0 && count < required) return "shortage";
  return "critical";
});

// Indexes
schoolSchema.index({ city: 1 });
schoolSchema.index({ status: 1 });
schoolSchema.index({ currentTrainers: 1 });

const School = mongoose.model("School", schoolSchema);
export default School;



import mongoose from "mongoose";

const employeePostingSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    // Add these fields to EmployeePosting model
    monthlyBillingSalary: {
      type: Number,
      required: [true, "Billing rate is required"],
      min: [0, "Billing rate cannot be negative"],
    },
    startDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["continue", "resign", "terminate", "change_school"],
      default: "continue",
      required: true,
    },
    remark: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ✅ Virtual for total billing
employeePostingSchema.virtual("totalBilling").get(function () {
  if (!this.endDate) return null;
  const days = Math.ceil(
    (this.endDate - this.startDate) / (1000 * 60 * 60 * 24),
  );
  const months = days / 30;
  return this.monthlyBillingSalary * months;
});

// ✅ Pre-save validation
employeePostingSchema.pre("save", function (next) {
  if (this.isActive && !this.monthlyBillingSalary) {
    next(new Error("Billing rate is required for active postings"));
  }
  if (this.isActive && this.monthlyBillingSalary <= 0) {
    next(new Error("Billing rate must be greater than 0"));
  }
  next();
});

/* =====================================================
   🛡 LOOP PROTECTION
===================================================== */
employeePostingSchema.pre("save", function (next) {
  if (this._skipHook) return next();
  next();
});

/* =====================================================
   POST SAVE
===================================================== */
employeePostingSchema.post("save", async function (doc) {
  if (doc._skipHook) return;
  await handleTrainerUpdate(doc);
});

/* =====================================================
   POST FINDONEANDUPDATE
===================================================== */
employeePostingSchema.post("findOneAndUpdate", async function () {
  const doc = await this.model.findOne(this.getQuery());
  if (!doc || doc._skipHook) return;
  await handleTrainerUpdate(doc);
});

/* =====================================================
   🔥 MAIN LOGIC WITH BILLING RATE VALIDATION
===================================================== */
async function handleTrainerUpdate(posting) {
  const School = mongoose.model("School");
  const EmployeePosting = mongoose.model("EmployeePosting");

  const employeeId = posting.employee;
  const schoolId = posting.school;

  /* ---------------- RESIGN / TERMINATE ---------------- */
  if (posting.status === "resign" || posting.status === "terminate") {
    await School.findByIdAndUpdate(schoolId, {
      $pull: { currentTrainers: employeeId },
    });

    posting.isActive = false;
    posting.endDate = new Date();
    posting._skipHook = true;
    await posting.save({ validateBeforeSave: false });
  } else if (

  /* ---------------- CHANGE SCHOOL / CONTINUE ---------------- */
    posting.status === "change_school" ||
    posting.status === "continue"
  ) {
    //  Validate billing rate before activation
    if (!posting.monthlyBillingSalary || posting.monthlyBillingSalary <= 0) {
      console.error(`Invalid billing rate for posting ${posting._id}`);
      // Aap yahan error throw kar sakte ho ya default set kar sakte ho
      // throw new Error('Cannot activate posting without valid billing rate');
    }

    const otherPostings = await EmployeePosting.find({
      employee: employeeId,
      isActive: true,
      _id: { $ne: posting._id },
    });

    for (const old of otherPostings) {
      await School.findByIdAndUpdate(old.school, {
        $pull: { currentTrainers: employeeId },
      });

      old.isActive = false;
      old.endDate = new Date();
      old._skipHook = true;
      await old.save({ validateBeforeSave: false });
    }

    await School.findByIdAndUpdate(schoolId, {
      $addToSet: { currentTrainers: employeeId },
    });

    posting.isActive = true;
    posting._skipHook = true;
    await posting.save({ validateBeforeSave: false });
  }
}

/* =====================================================
   INDEXES - UPDATED
===================================================== */
employeePostingSchema.index({ employee: 1, isActive: 1 });
employeePostingSchema.index({ school: 1, isActive: 1 });
employeePostingSchema.index({ status: 1 });
employeePostingSchema.index({ monthlyBillingSalary: 1 });
employeePostingSchema.index({ school: 1, isActive: 1, monthlyBillingSalary: 1 });


export default mongoose.model("EmployeePosting", employeePostingSchema);


import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
}, { _id: false });

const bankDetailsSchema = new mongoose.Schema({
    accountHolderName: String,
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    branch: String
}, { _id: false });

const emergencyContactSchema = new mongoose.Schema({
    name: String,
    number: String,
    relation: String,
    address: String
}, { _id: false });

const trainingSchema = new mongoose.Schema({
    name: String,
    type: {
        type: String,
        enum: ['Internal', 'External', 'Workshop', 'Seminar']
    },
    date: Date,
    certificate: String,
    duration: String,
    completed: Boolean,
    organizer: String
}, { _id: false });

const finalSettlementSchema = new mongoose.Schema({
    amount: Number,
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Completed', 'Rejected'],
        default: 'Pending'
    },
    paidDate: Date,
    details: String,
    transactionId: String
}, { _id: false });

// Documents Schema with Cloudinary Public IDs
const documentsSchema = new mongoose.Schema({
    // Required Documents
    offerLetter: { type: String, default: null },
    offerLetterPublicId: { type: String, default: null },
    
    appointmentLetter: { type: String, default: null },
    appointmentLetterPublicId: { type: String, default: null }, // FIXED: Added 'type'
    
    resume: { type: String, default: null },
    resumePublicId: { type: String, default: null },
    
    passportPhoto: { type: String, default: null },
    passportPhotoPublicId: { type: String, default: null },
    
    panCard: { type: String, default: null },
    panCardPublicId: { type: String, default: null },
    
    aadhaarCard: { type: String, default: null },
    aadhaarCardPublicId: { type: String, default: null },
    
    addressProof: { type: String, default: null },
    addressProofPublicId: { type: String, default: null },

    // Arrays for multiple documents
    educationalCertificates: [{
        certificateName: String,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    idProofs: [{
        documentType: String,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    joiningDocuments: [{
        documentName: String,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    experienceLetters: [{
        companyName: String,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    relievingLetters: [{
        companyName: String,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    salarySlips: [{
        month: String,
        year: Number,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    incrementLetters: [{
        effectiveDate: Date,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    performanceReports: [{
        year: Number,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    appraisalLetters: [{
        year: Number,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    ndaAgreement: { type: String, default: null },
    ndaAgreementPublicId: { type: String, default: null },
    
    bondAgreement: { type: String, default: null },
    bondAgreementPublicId: { type: String, default: null },

    otherDocuments: [{
        documentName: String,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }]
}, { _id: false });

const employeeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    basicInfo: {
        fullName: { type: String, required: true, trim: true },
        employeeId: { type: String, required: true, unique: true, trim: true },
        designation: { type: String, required: true, trim: true },
        department: { type: String, required: true, trim: true },
        reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        dateOfJoining: { type: Date, required: true },
        employmentType: {
            type: String,
            enum: ['Full-Time', 'Part-Time', 'Intern', 'Contract'],
            required: true
        },
        workMode: {
            type: String,
            enum: ['Onsite', 'Work-from-Home', 'Hybrid'],
            required: true
        },
        workLocation: { type: String, required: true, trim: true },
        employeeStatus: {
            type: String,
            enum: ['Active', 'On-Notice', 'Resigned', 'Terminated', 'Probation'],
            default: 'Active'
        },
        salary: { type: Number, default: 0 }
    },

    personalDetails: {
        dateOfBirth: Date,
        gender: {
            type: String,
            enum: ['Male', 'Female', 'Other', 'Prefer-not-to-say']
        },
        bloodGroup: {
            type: String,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        },
        contactNumber: String,
        alternateContactNumber: String,
        personalEmail: String,
        currentAddress: addressSchema,
        permanentAddress: addressSchema,
        emergencyContact: emergencyContactSchema,
        maritalStatus: {
            type: String,
            enum: ['Single', 'Married', 'Divorced', 'Widowed']
        },
        bankDetails: bankDetailsSchema,
        panNumber: {
            type: String,
            uppercase: true,
            match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN']
        },
        aadhaarNumber: {
            type: String,
            match: [/^\d{12}$/, 'Invalid Aadhaar']
        },
    },

    // FIX: Initialize documents with empty object
    documents: {
        type: documentsSchema,
        default: () => ({})
    },

    training: [trainingSchema],

    exitDetails: {
        noticePeriodStart: Date,
        noticePeriodEnd: Date,
        resignationDate: Date,
        finalSettlement: finalSettlementSchema,
        clearanceStatus: {
            type: String,
            enum: ['Pending', 'In Progress', 'Completed', 'Rejected'],
            default: 'Pending'
        },
        relievingDate: Date,
        experienceLetter: String,
        exitReason: String,
        feedback: String,
        exitInterview: String
    },

    completionStatus: {
        basicInfo: { type: Boolean, default: true },
        personalDetails: { type: Boolean, default: false },
        documents: {
            required: { type: Boolean, default: false },
            optional: { type: Object, default: {} }
        },
        training: { type: Boolean, default: true },
        overallPercentage: { type: Number, default: 25, min: 0, max: 100 }
    },

    verification: {
        isVerified: { type: Boolean, default: false },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        verifiedAt: Date,
        comments: String,
        verificationLevel: {
            type: String,
            enum: ['Pending', 'In Progress', 'Verified', 'Rejected'],
            default: 'Pending'
        },
        rejectionReason: String
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastProfileUpdate: Date

}, {
    timestamps: true
});

// FIXED: Calculate completion percentage with better null checks
employeeSchema.methods.calculateCompletion = function () {
    let percentage = 25; // Basic info always filled by HR

    // Personal Details (37.5%)
    const personalFields = [
        this.personalDetails?.dateOfBirth,
        this.personalDetails?.contactNumber,
        this.personalDetails?.personalEmail,
        this.personalDetails?.panNumber,
        this.personalDetails?.aadhaarNumber,
        this.personalDetails?.emergencyContact?.name,
        this.personalDetails?.emergencyContact?.number,
        this.personalDetails?.currentAddress?.street,
        this.personalDetails?.currentAddress?.city,
        this.personalDetails?.currentAddress?.pincode,
        this.personalDetails?.bankDetails?.accountHolderName,
        this.personalDetails?.bankDetails?.bankName,
        this.personalDetails?.bankDetails?.accountNumber,
        this.personalDetails?.bankDetails?.ifscCode,
        this.personalDetails?.bankDetails?.branch
    ];

    // FIX: Use filter instead of every for better handling
    const filledPersonalFields = personalFields.filter(field => 
        field !== null && field !== undefined && field !== ''
    ).length;
    
    const personalCompletion = (filledPersonalFields / personalFields.length) * 37.5;
    this.completionStatus.personalDetails = filledPersonalFields === personalFields.length;
    percentage += personalCompletion;

    // Required Documents (37.5%) - Better null checks
    const docFields = [
        this.documents?.offerLetter,
        this.documents?.appointmentLetter,
        this.documents?.resume,
        this.documents?.passportPhoto,
        this.documents?.panCard,
        this.documents?.aadhaarCard,
        this.documents?.addressProof
    ];

    const filledDocFields = docFields.filter(doc => 
        doc !== null && doc !== undefined && doc !== ''
    ).length;

    // Check array documents
    const hasEducationalCerts = this.documents?.educationalCertificates?.length > 0;
    const hasIdProofs = this.documents?.idProofs?.length > 0;

    const totalDocFields = docFields.length + 2; // +2 for arrays
    const filledTotalDocFields = filledDocFields + (hasEducationalCerts ? 1 : 0) + (hasIdProofs ? 1 : 0);

    const docCompletion = (filledTotalDocFields / totalDocFields) * 37.5;
    this.completionStatus.documents.required = filledTotalDocFields === totalDocFields;
    percentage += docCompletion;

    this.completionStatus.overallPercentage = Math.round(percentage);
    return this.completionStatus.overallPercentage;
};

// FIXED: Check if ready for verification with null checks
employeeSchema.methods.isReadyForVerification = function () {
    this.calculateCompletion();
    return this.completionStatus.overallPercentage === 100 &&
        this.completionStatus.personalDetails &&
        this.completionStatus.documents.required;
};

// FIXED: Pre-save middleware with error handling
employeeSchema.pre('save', function () {
    try {
        this.calculateCompletion();
        this.lastProfileUpdate = new Date();
        // next();
    } catch (error) {
        console.error('Error in pre-save middleware:', error);
        // next();
    }
});

// Indexes
employeeSchema.index({ 'basicInfo.department': 1 });
employeeSchema.index({ 'verification.isVerified': 1 });
employeeSchema.index({ 'completionStatus.overallPercentage': 1 });

export default mongoose.model('Employee', employeeSchema);

import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

holidaySchema.index({ date: 1 });

export default mongoose.model('Holiday', holidaySchema);

// models/Invoice.js
import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  employeeName: {
    type: String,
    required: true,
  },
  employeeId: {
    type: String,
    required: true,
  },
  monthlyBillingSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  leaveDays: {
    type: Number,
    default: 0,
  },
  leaveDeduction: {
    type: Number,
    default: 0,
  },
  workingDays: {
    type: Number,
    default: 30, // Assuming 30 days month
  },
  actualWorkingDays: {
    type: Number,
    default: 30,
  },
  proratedAmount: {
    type: Number,
    required: true,
  },
  // Per employee TDS/GST if needed
  tdsPercent: {
    type: Number,
    default: 0,
  },
  tdsAmount: {
    type: Number,
    default: 0,
  },
  gstPercent: {
    type: Number,
    default: 0,
  },
  gstAmount: {
    type: Number,
    default: 0,
  },
  subtotal: {
    type: Number,
    required: true,
  },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    schoolDetails: {
      name: String,
      city: String,
      address: String,
      contactPersonName: String,
      mobile: String,
      email: String,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },

    // Invoice items (employees)
    items: [invoiceItemSchema],

    // Summary
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },

    // TDS (Overall)
    tdsPercent: {
      type: Number,
      default: 0,
    },
    tdsAmount: {
      type: Number,
      default: 0,
    },

    // GST (Overall)
    gstPercent: {
      type: Number,
      default: 0,
    },
    gstAmount: {
      type: Number,
      default: 0,
    },

    // Round off
    roundOff: {
      type: Number,
      default: 0,
    },

    // Grand Total
    grandTotal: {
      type: Number,
      required: true,
    },
    previousDue: {
      type: Number,
      default: 0,
    },

    // Status
    status: {
      type: String,
      enum: ["Draft", "Generated", "Verified", "Sent", "Paid", "Cancelled"],
      default: "Generated",
    },

    // Generated By System (Auto)
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },

    // Verified By Admin
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: Date,

    // Sent to School
    sentAt: Date,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Payment
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partial", "Paid", "Overdue"],
      default: "Unpaid",
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    dueDate: Date,
    paidAt: Date,

    // Invoice PDF
    pdfUrl: String,
    pdfPublicId: String,

    // Customizations (Admin can modify before verification)
    customizations: {
      leaveAdjustments: [
        {
          employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
          },
          originalLeaveDays: Number,
          adjustedLeaveDays: Number,
          reason: String,
          adjustedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          adjustedAt: Date,
        },
      ],
      tdsAdjustment: {
        originalPercent: Number,
        adjustedPercent: Number,
        reason: String,
      },
      gstAdjustment: {
        originalPercent: Number,
        adjustedPercent: Number,
        reason: String,
      },
      otherAdjustments: [
        {
          description: String,
          amount: Number,
          type: {
            enum: ["Add", "Deduct"],
          },
          reason: String,
        },
      ],
    },

    // Notes
    notes: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

invoiceSchema.pre("validate", async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const year = this.year.toString().slice(-2);
    const month = this.month.toString().padStart(2, "0");

    const lastInvoice = await this.constructor
      .findOne({
        month: this.month,
        year: this.year,
      })
      .sort({ createdAt: -1 });

    let sequence = 1;

    if (lastInvoice && lastInvoice.invoiceNumber) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split("-")[2]);
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    this.invoiceNumber = `INV-${year}${month}-${sequence.toString().padStart(3, "0")}`;
  }

  next();
});

// Method to calculate totals
invoiceSchema.methods.calculateTotals = function () {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce(
    (sum, item) => sum + item.proratedAmount,
    0,
  );

  // Calculate TDS
  this.tdsAmount = (this.subtotal * this.tdsPercent) / 100;

  // Calculate GST
  this.gstAmount = (this.subtotal * this.gstPercent) / 100;

  // Calculate grand total INCLUDING previous due
  let total =
    this.subtotal - this.tdsAmount + this.gstAmount + (this.previousDue || 0); // ⬅️ YEH CHANGE

  // Apply round off
  this.roundOff = Math.round(total) - total;
  this.grandTotal = Math.round(total);

  return {
    subtotal: this.subtotal,
    tdsAmount: this.tdsAmount,
    gstAmount: this.gstAmount,
    previousDue: this.previousDue, // ⬅️ YEH BHI ADD KARO
    roundOff: this.roundOff,
    grandTotal: this.grandTotal,
  };
};

// Virtual for days in month
invoiceSchema.virtual("daysInMonth").get(function () {
  return new Date(this.year, this.month, 0).getDate();
});

// Indexes
invoiceSchema.index({ school: 1, month: 1, year: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ dueDate: 1 });

export default mongoose.model("Invoice", invoiceSchema);

import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leaveType: {
    type: String,
    enum: ['Casual', 'Sick', 'Earned', 'Maternity', 'Paternity', 'Unpaid'],
    default: 'Casual'
  },
  fromDate: {
    type: Date,
    required: true
  },
  toDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },
  totalDays: {
    type: Number,
    default: 1
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String
}, {
  timestamps: true
});

leaveSchema.pre('save', function(next) {
  if (this.fromDate && this.toDate) {
    const diffTime = Math.abs(this.toDate - this.fromDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    this.totalDays = diffDays + 1;
  }
  next();
});

leaveSchema.index({ employee: 1, fromDate: 1 });
leaveSchema.index({ status: 1 });

export default mongoose.model('Leave', leaveSchema);



// models/Payment.js
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  invoices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  }],
  paymentNumber: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentDate: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Cheque', 'Bank Transfer', 'Online', 'DD'],
    required: true
  },
  referenceNumber: String, // Cheque/Transaction number
  bankName: String,
  branch: String,
  remarks: String,
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  receiptNumber: String,
  receiptPdf: String,
  receiptPublicId: String,
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

paymentSchema.pre('save', async function(next) {
  if (this.isNew && !this.paymentNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    const lastPayment = await this.constructor.findOne().sort({ paymentNumber: -1 });
    
    let sequence = 1;
    if (lastPayment && lastPayment.paymentNumber) {
      const lastSeq = parseInt(lastPayment.paymentNumber.split('-')[2]);
      sequence = lastSeq + 1;
    }
    
    this.paymentNumber = `PAY-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  }
  next();
});

export default mongoose.model('Payment', paymentSchema);


// models/SchoolLedger.js
import mongoose from 'mongoose';

const schoolLedgerSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  transactionType: {
    type: String,
    enum: ['Invoice Generated', 'Payment Received', 'Adjustment', 'Credit Note', 'Debit Note'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balance: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  month: Number,
  year: Number,
  description: String,
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Cheque', 'Bank Transfer', 'Online', 'DD']
  },
  reference: String, // Cheque/Transaction number
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

schoolLedgerSchema.index({ school: 1, date: -1 });
schoolLedgerSchema.index({ invoice: 1 });

export default mongoose.model('SchoolLedger', schoolLedgerSchema);



// pages/Invoices/Invoices.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  IconButton,
  Chip,
  MenuItem,
  Grid,
  Typography,
  Tooltip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  Checkbox,
} from "@mui/material";
import {
  Visibility,
  GetApp,
  CheckCircle,
  Send,
  Payment,
  Cancel,
  FilterList,
  Refresh,
  PictureAsPdf,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import invoiceService from "../../services/invoiceService";

const statusColors = {
  Draft: "default",
  Generated: "info",
  Verified: "success",
  Sent: "primary",
  Paid: "success",
  Cancelled: "error",
};

const paymentStatusColors = {
  Unpaid: "error",
  Partial: "warning",
  Paid: "success",
  Overdue: "error",
};

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: "",
    paymentStatus: "",
    search: "",
  });
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [page, rowsPerPage, filters]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...filters,
      };
      const response = await invoiceService.getInvoices(params);
      setInvoices(response.data.data);
      setTotal(response.data.pagination.total);
    } catch (error) {
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (
      !window.confirm(`Generate invoices for ${filters.month}/${filters.year}?`)
    )
      return;

    try {
      setGenerating(true);
      await invoiceService.autoGenerate({
        manualMonth: filters.month,
        manualYear: filters.year,
      });
      toast.success("Invoices generated successfully");
      fetchInvoices();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to generate invoices",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkSend = async () => {
    if (selectedInvoices.length === 0) {
      toast.error("Please select at least one invoice");
      return;
    }

    if (!window.confirm(`Send ${selectedInvoices.length} invoices to schools?`))
      return;

    try {
      setSending(true);
      const response = await invoiceService.sendBulk(selectedInvoices);
      toast.success(`Sent ${response.data.data.sent.length} invoices`);
      setSelectedInvoices([]);
      fetchInvoices();
    } catch (error) {
      toast.error("Failed to send invoices");
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async (id, invoiceNumber) => {
    try {
      const response = await invoiceService.downloadInvoice(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Failed to download invoice");
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedInvoices(invoices.map((inv) => inv._id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedInvoices((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">Invoices</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchInvoices}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PictureAsPdf />}
            onClick={handleAutoGenerate}
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate Invoices"}
          </Button>
          {selectedInvoices.length > 0 && (
            <Button
              variant="contained"
              color="success"
              startIcon={<Send />}
              onClick={handleBulkSend}
              disabled={sending}
            >
              Send {selectedInvoices.length} Invoices
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Month</InputLabel>
              <Select
                value={filters.month}
                label="Month"
                onChange={(e) =>
                  setFilters({ ...filters, month: e.target.value })
                }
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString("default", {
                      month: "long",
                    })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              fullWidth
              size="small"
              label="Year"
              type="number"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Generated">Generated</MenuItem>
                <MenuItem value="Verified">Verified</MenuItem>
                <MenuItem value="Sent">Sent</MenuItem>
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Payment</InputLabel>
              <Select
                value={filters.paymentStatus}
                label="Payment"
                onChange={(e) =>
                  setFilters({ ...filters, paymentStatus: e.target.value })
                }
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Unpaid">Unpaid</MenuItem>
                <MenuItem value="Partial">Partial</MenuItem>
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Overdue">Overdue</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="Search by invoice or school"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedInvoices.length > 0 &&
                    selectedInvoices.length < invoices.length
                  }
                  checked={
                    invoices.length > 0 &&
                    selectedInvoices.length === invoices.length
                  }
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Invoice No.</TableCell>
              <TableCell>School</TableCell>
              <TableCell>Period</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Payment</TableCell>
              <TableCell>Generated</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  <Alert severity="info">No invoices found</Alert>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice._id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedInvoices.includes(invoice._id)}
                      onChange={() => handleSelectOne(invoice._id)}
                      disabled={invoice.status !== "Verified"}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {invoice.invoiceNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>{invoice.school?.name}</TableCell>
                  <TableCell>
                    {invoice.month}/{invoice.year}
                  </TableCell>
                  <TableCell align="right" fontWeight="bold">
                    {formatCurrency(invoice.grandTotal)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.status}
                      size="small"
                      color={statusColors[invoice.status] || "default"}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.paymentStatus}
                      size="small"
                      color={
                        paymentStatusColors[invoice.paymentStatus] || "default"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.generatedAt), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        justifyContent: "center",
                      }}
                    >
                      <Tooltip title="View">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => navigate(`/invoices/${invoice._id}`)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {invoice.status === "Generated" && (
                        <Tooltip title="Verify">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() =>
                              navigate(`/invoices/${invoice._id}/verify`)
                            }
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {invoice.status === "Sent" &&
                        invoice.paymentStatus !== "Paid" && (
                          <Tooltip title="Record Payment">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() =>
                                navigate(`/invoices/${invoice._id}/payment`)
                              }
                            >
                              <Payment fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                      <Tooltip title="Download PDF">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() =>
                            handleDownload(invoice._id, invoice.invoiceNumber)
                          }
                        >
                          <GetApp fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </Box>
  );
};

export default Invoices;


// pages/Invoices/InvoiceVerify.jsx (Fixed with Prorated Amount)

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Edit,
  Cancel
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import invoiceService from '../../services/invoiceService';

const InvoiceVerify = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    tdsPercent: 0,
    gstPercent: 0,
    items: [],
    notes: ''
  });

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getInvoice(id);
      const invoiceData = response.data.data;
      
      console.log('Invoice Data:', invoiceData);
      
      setInvoice(invoiceData);
      
      // Process items with correct field mapping
      const processedItems = invoiceData.items.map(item => {
        // Extract employee details
        const employeeId = item.employee?._id || item.employee;
        const employeeName = item.employeeName || item.employee?.basicInfo?.fullName || '';
        const employeeIdString = item.employeeId || item.employee?.basicInfo?.employeeId || '';
        
        // Use the workingDays from the invoice data (15 days for March)
        const workingDays = item.workingDays || 0;
        
        return {
          ...item,
          employeeObjectId: employeeId,
          employeeName: employeeName,
          employeeId: employeeIdString,
          monthlyBillingSalary: item.monthlyBillingSalary,
          leaveDays: item.leaveDays || 0,
          adjustedLeaveDays: item.leaveDays || 0,
          originalLeaveDays: item.leaveDays || 0,
          workingDays: workingDays,
          proratedAmount: item.proratedAmount || 0 // ✅ Store original prorated amount
        };
      });
      
      console.log('Processed Items:', processedItems);
      
      setFormData({
        tdsPercent: invoiceData.tdsPercent || 0,
        gstPercent: invoiceData.gstPercent || 0,
        items: processedItems,
        notes: invoiceData.notes || ''
      });
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch invoice');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const calculateItemDetails = (item) => {
    const totalWorkingDays = item.workingDays || 0; // 15 days
    const monthlySalary = item.monthlyBillingSalary || 0; // ₹60,000
    
    // Calculate daily rate based on working days
    const dailyRate = monthlySalary / totalWorkingDays; // ₹4,000 per day
    
    // Get leave days (adjusted or original)
    const leaveDays = item.adjustedLeaveDays !== undefined ? item.adjustedLeaveDays : (item.leaveDays || 0);
    
    // Calculate leave deduction
    const leaveDeduction = Math.round(dailyRate * leaveDays); // ₹0 (if leaveDays = 0)
    
    // ✅ FIX: Net amount should be monthly salary minus leave deduction
    // This should equal prorated amount (₹29,032) when leaveDays = 0
    const netAmount = monthlySalary - leaveDeduction; // ₹60,000 - ₹0 = ₹60,000 ❌
    
    // ✅ CORRECT: Prorated amount should be based on working days, not full month
    // For March: (15/31) * ₹60,000 = ₹29,032
    const correctProratedAmount = Math.round((totalWorkingDays / 31) * monthlySalary);
    
    // Actual working days after leave
    const actualWorkingDays = totalWorkingDays - leaveDays;
    
    return {
      dailyRate: Math.round(dailyRate),
      leaveDays,
      leaveDeduction,
      actualWorkingDays,
      totalWorkingDays,
      // ✅ Show prorated amount instead of full monthly salary
      proratedAmount: item.proratedAmount || correctProratedAmount,
      monthlySalary
    };
  };

  const calculateTotals = () => {
    // ✅ Use prorated amounts for subtotal, not full monthly salaries
    const subtotal = formData.items.reduce((sum, item) => {
      const details = calculateItemDetails(item);
      return sum + details.proratedAmount;
    }, 0);
    
    const tdsAmount = Math.round((subtotal * (formData.tdsPercent || 0)) / 100);
    const gstAmount = Math.round((subtotal * (formData.gstPercent || 0)) / 100);
    const grandTotal = subtotal - tdsAmount + gstAmount;
    
    return {
      subtotal,
      tdsAmount,
      gstAmount,
      grandTotal
    };
  };

  const handleLeaveAdjustment = (index, value) => {
    const newItems = [...formData.items];
    const totalWorkingDays = formData.items[index].workingDays || 0;
    
    const leaveValue = parseInt(value) || 0;
    if (leaveValue >= 0 && leaveValue <= totalWorkingDays) {
      newItems[index].adjustedLeaveDays = leaveValue;
      
      // Recalculate prorated amount based on new leave days
      const monthlySalary = newItems[index].monthlyBillingSalary || 0;
      const workingDays = newItems[index].workingDays || 0;
      const newLeaveDays = leaveValue;
      
      // Calculate new prorated amount
      // Formula: (monthlySalary / 31) * (workingDays - newLeaveDays)
      const newProratedAmount = Math.round((monthlySalary / 31) * (workingDays - newLeaveDays));
      newItems[index].proratedAmount = newProratedAmount;
      
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      
      const verifyItems = formData.items.map(item => {
        const employeeId = item.employeeObjectId || item.employee?._id || item.employee;
        
        return {
          employee: employeeId,
          employeeName: item.employeeName,
          employeeId: item.employeeId,
          monthlyBillingSalary: item.monthlyBillingSalary,
          leaveDays: item.adjustedLeaveDays !== undefined ? item.adjustedLeaveDays : (item.leaveDays || 0)
        };
      });
      
      const verifyData = {
        tdsPercent: formData.tdsPercent || 0,
        gstPercent: formData.gstPercent || 0,
        items: verifyItems,
        notes: formData.notes || ''
      };
      
      console.log('Submitting verify data:', verifyData);
      
      const response = await invoiceService.verifyInvoice(id, verifyData);
      toast.success('Invoice verified successfully');
      navigate(`/invoices/${id}`);
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error.response?.data?.message || 'Failed to verify invoice');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!invoice) return null;

  if (invoice.status !== 'Generated') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          This invoice cannot be verified. Current status: {invoice.status}
        </Alert>
        <Button
          sx={{ mt: 2 }}
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/invoices/${id}`)}
        >
          Back to Invoice
        </Button>
      </Box>
    );
  }

  const totals = calculateTotals();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(`/invoices/${id}`)}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">
          Verify Invoice {invoice.invoiceNumber}
        </Typography>
        <Chip label="Verification Mode" color="warning" icon={<Edit />} />
      </Box>

      <Grid container spacing={3}>
        {/* Left - Invoice Items */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Invoice Items (Adjust Leave Days)
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>Employee</TableCell>
                    <TableCell align="right">Monthly Rate</TableCell>
                    <TableCell align="center">Leave Days</TableCell>
                    <TableCell align="right">Leave Deduction</TableCell>
                    <TableCell align="center">Working Days</TableCell>
                    <TableCell align="right">Prorated Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.items.map((item, index) => {
                    const details = calculateItemDetails(item);
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {item.employeeName || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.employeeId || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" fontWeight="bold">
                          {formatCurrency(item.monthlyBillingSalary)}
                          <Typography variant="caption" display="block" color="text.secondary">
                            Full Month
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={details.leaveDays}
                            onChange={(e) => handleLeaveAdjustment(index, e.target.value)}
                            inputProps={{ 
                              min: 0, 
                              max: details.totalWorkingDays,
                              step: 1
                            }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          - {formatCurrency(details.leaveDeduction)}
                          <Typography variant="caption" display="block">
                            ({details.leaveDays} days × {formatCurrency(details.dailyRate)}/day)
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={`${details.actualWorkingDays}/${details.totalWorkingDays}`}
                            size="small"
                            color={details.leaveDays > 0 ? "warning" : "success"}
                          />
                          <Typography variant="caption" display="block" color="text.secondary">
                            of {invoice.daysInMonth} total days
                          </Typography>
                        </TableCell>
                        <TableCell align="right" fontWeight="bold" sx={{ color: 'primary.main' }}>
                          {formatCurrency(details.proratedAmount)}
                          <Typography variant="caption" display="block" color="text.secondary">
                            (Prorated Amount)
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary Row */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Total Monthly Billing:
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(formData.items.reduce((sum, item) => sum + (item.monthlyBillingSalary || 0), 0))}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Total Leave Deduction:
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    - {formatCurrency(formData.items.reduce((sum, item) => {
                      const details = calculateItemDetails(item);
                      return sum + details.leaveDeduction;
                    }, 0))}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal (Prorated):
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    {formatCurrency(totals.subtotal)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Verification Notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Add any notes about verification..."
              />
            </Box>
          </Paper>
        </Grid>

        {/* Right - Summary & Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Verification Summary
            </Typography>

            <Box sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="TDS Percent"
                    type="number"
                    value={formData.tdsPercent}
                    onChange={(e) => setFormData({...formData, tdsPercent: parseFloat(e.target.value) || 0})}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>
                    }}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="GST Percent"
                    type="number"
                    value={formData.gstPercent}
                    onChange={(e) => setFormData({...formData, gstPercent: parseFloat(e.target.value) || 0})}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>
                    }}
                    size="small"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal (Prorated):
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" fontWeight="bold">
                    {formatCurrency(totals.subtotal)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    TDS ({formData.tdsPercent}%):
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" sx={{ color: 'error.main' }}>
                    - {formatCurrency(totals.tdsAmount)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    GST ({formData.gstPercent}%):
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" sx={{ color: 'success.main' }}>
                    + {formatCurrency(totals.gstAmount)}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="h5" fontWeight="bold">
                    Grand Total:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h5" align="right" color="primary.main" fontWeight="bold">
                    {formatCurrency(totals.grandTotal)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => navigate(`/invoices/${id}`)}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<Save />}
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? 'Verifying...' : 'Verify Invoice'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InvoiceVerify;

// pages/Invoices/InvoiceView.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Avatar 
} from "@mui/material";
import {
  ArrowBack,
  CheckCircle,
  Payment,
  GetApp,
  Cancel,
  Edit,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import invoiceService from "../../services/invoiceService";

const statusColors = {
  Draft: "default",
  Generated: "info",
  Verified: "success",
  Sent: "primary",
  Paid: "success",
  Cancelled: "error",
};

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getInvoice(id);
      setInvoice(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch invoice");
      navigate("/invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await invoiceService.downloadInvoice(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Failed to download invoice");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Invoice not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/invoices")}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4">Invoice {invoice.invoiceNumber}</Typography>
          <Chip
            label={invoice.status}
            color={statusColors[invoice.status]}
            size="small"
          />
          <Chip
            label={invoice.paymentStatus}
            color={invoice.paymentStatus === "Paid" ? "success" : "warning"}
            size="small"
          />
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          {invoice.status === "Generated" && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => navigate(`/invoices/${id}/verify`)}
            >
              Verify Invoice
            </Button>
          )}
          {invoice.status === "Sent" && invoice.paymentStatus !== "Paid" && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<Payment />}
              onClick={() => navigate(`/invoices/${id}/payment`)}
            >
              {invoice.paymentStatus === "Partial"
                ? "Add Remaining Payment"
                : "Record Payment"}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<GetApp />}
            onClick={handleDownload}
          >
            Download PDF
          </Button>
        </Box>
      </Box>

      {/* School Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          School Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              School Name
            </Typography>
            <Typography variant="body1" gutterBottom>
              {invoice.school?.name}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary">
              Address
            </Typography>
            <Typography variant="body1" gutterBottom>
              {invoice.schoolDetails?.address}, {invoice.schoolDetails?.city}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Contact Person
            </Typography>
            <Typography variant="body1" gutterBottom>
              {invoice.schoolDetails?.contactPersonName}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary">
              Email / Mobile
            </Typography>
            <Typography variant="body1" gutterBottom>
              {invoice.schoolDetails?.email} | {invoice.schoolDetails?.mobile}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Invoice Items */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Invoice Items
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell>Sr No.</TableCell>
                <TableCell>Employee Name</TableCell>
                <TableCell>Employee ID</TableCell>
                <TableCell align="right">Monthly Rate</TableCell>
                <TableCell align="center">Leave Days</TableCell>
                <TableCell align="center">Working Days</TableCell>
                <TableCell align="right">Prorated Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{item.employeeName}</TableCell>
                  <TableCell>{item.employeeId}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(item.monthlyBillingSalary)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={item.leaveDays}
                      size="small"
                      color={item.leaveDays > 0 ? "warning" : "success"}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {item.workingDays}
                  </TableCell>
                  <TableCell align="right" fontWeight="bold">
                    {formatCurrency(item.proratedAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Summary */}
      <Grid container spacing={3}>
        {/* Step-by-Step Calculation */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Invoice Calculation Breakdown
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Here's how your invoice total was calculated, step by step:
              </Typography>

              <Box sx={{ mt: 3 }}>
                {/* Step 1: Subtotal */}
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar
                        sx={{
                          bgcolor: "primary.main",
                          width: 28,
                          height: 28,
                          fontSize: "0.875rem",
                        }}
                      >
                        1
                      </Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Calculate Subtotal
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Sum of all employee prorated amounts
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2">
                          Total of all items:
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {formatCurrency(invoice.subtotal)}
                        </Typography>
                      </Box>
                      <Box sx={{ mt: 1 }}>
                        {invoice.items.map((item, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.875rem",
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.employeeName} ({item.actualWorkingDays}/
                              {item.workingDays} days):
                            </Typography>
                            <Typography variant="caption">
                              {formatCurrency(item.proratedAmount)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Step 2: Apply TDS */}
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar
                        sx={{
                          bgcolor: "primary.main",
                          width: 28,
                          height: 28,
                          fontSize: "0.875rem",
                        }}
                      >
                        2
                      </Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Apply TDS (Tax Deducted at Source)
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        TDS is calculated on the subtotal amount
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2">
                          {invoice.tdsPercent}% of{" "}
                          {formatCurrency(invoice.subtotal)}:
                        </Typography>
                        <Typography variant="h6" color="error">
                          - {formatCurrency(invoice.tdsAmount)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          mt: 1,
                          p: 1,
                          bgcolor: "error.light",
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="caption" color="error.dark">
                          Amount after TDS:{" "}
                          {formatCurrency(invoice.subtotal - invoice.tdsAmount)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Step 3: Add GST */}
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar
                        sx={{
                          bgcolor: "primary.main",
                          width: 28,
                          height: 28,
                          fontSize: "0.875rem",
                        }}
                      >
                        3
                      </Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Add GST (Goods & Services Tax)
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        GST is applied after TDS deduction
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2">
                          {invoice.gstPercent}% of (Subtotal - TDS):
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          + {formatCurrency(invoice.gstAmount)}
                        </Typography>
                      </Box>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" display="block">
                          Calculation: {invoice.gstPercent}% of{" "}
                          {formatCurrency(invoice.subtotal - invoice.tdsAmount)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Step 4: Round Off */}
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar
                        sx={{
                          bgcolor: "primary.main",
                          width: 28,
                          height: 28,
                          fontSize: "0.875rem",
                        }}
                      >
                        4
                      </Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Round Off Adjustment
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Round to nearest whole number
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2">
                          Round off adjustment:
                        </Typography>
                        <Typography variant="h6">
                          {formatCurrency(invoice.roundOff)}
                        </Typography>
                      </Box>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Before rounding:{" "}
                          {formatCurrency(
                            invoice.subtotal -
                              invoice.tdsAmount +
                              invoice.gstAmount,
                          )}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Final Total */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: "primary.light",
                    border: "2px solid",
                    borderColor: "primary.main",
                  }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar
                        sx={{
                          bgcolor: "success.main",
                          width: 28,
                          height: 28,
                          fontSize: "0.875rem",
                        }}
                      >
                        ✓
                      </Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color="primary.dark"
                      >
                        Final Amount
                      </Typography>
                      <Typography variant="body2" color="primary.dark">
                        Total invoice amount after all calculations
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="h5"
                          fontWeight="bold"
                          color="primary.dark"
                        >
                          GRAND TOTAL:
                        </Typography>
                        <Typography
                          variant="h4"
                          fontWeight="bold"
                          color="primary.dark"
                        >
                          {formatCurrency(invoice.grandTotal)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          mt: 1,
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Typography variant="caption" color="primary.dark">
                          = Subtotal - TDS + GST ± Round Off
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                💰 Payment Details
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Payment Status:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Chip
                      label={invoice.paymentStatus}
                      size="small"
                      color={
                        invoice.paymentStatus === "Paid" ? "success" : "warning"
                      }
                      sx={{ float: "right" }}
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Paid Amount:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right" fontWeight="bold">
                      {formatCurrency(invoice.paidAmount || 0)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Due Amount:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="body2"
                      align="right"
                      fontWeight="bold"
                      color="error"
                    >
                      {formatCurrency(
                        invoice.grandTotal - (invoice.paidAmount || 0),
                      )}
                    </Typography>
                  </Grid>

                  {invoice.paidAt && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Paid On:
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" align="right">
                          {format(new Date(invoice.paidAt), "dd/MM/yyyy")}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {invoice.customizations?.leaveAdjustments?.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="warning.main">
                  Customizations Applied
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>Original Leave</TableCell>
                        <TableCell>Adjusted Leave</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Adjusted By</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.customizations.leaveAdjustments.map(
                        (adj, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {adj.employee?.basicInfo?.fullName}
                            </TableCell>
                            <TableCell>{adj.originalLeaveDays}</TableCell>
                            <TableCell>{adj.adjustedLeaveDays}</TableCell>
                            <TableCell>{adj.reason}</TableCell>
                            <TableCell>{adj.adjustedBy?.name}</TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {invoice.notes && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Notes
                </Typography>
                <Typography variant="body2">{invoice.notes}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default InvoiceView;


// pages/Invoices/InvoicePayment.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  InputAdornment,
  IconButton 
} from '@mui/material';
import {
  ArrowBack,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import invoiceService from '../../services/invoiceService';

const paymentMethods = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Online', label: 'Online' },
  { value: 'DD', label: 'Demand Draft' }
];

const InvoicePayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: 'Bank Transfer',
    referenceNumber: '',
    bankName: '',
    branch: '',
    remarks: ''
  });

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getInvoice(id);
      setInvoice(response.data.data);
      
      const dueAmount = response.data.data.grandTotal - (response.data.data.paidAmount || 0);
      setFormData(prev => ({
        ...prev,
        amount: dueAmount
      }));
    } catch (error) {
      toast.error('Failed to fetch invoice');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || formData.amount <= 0) {
      toast.error('Please enter valid amount');
      return;
    }

    const dueAmount = invoice.grandTotal - (invoice.paidAmount || 0);
    if (formData.amount > dueAmount) {
      toast.error(`Amount cannot exceed due amount of ${formatCurrency(dueAmount)}`);
      return;
    }

    try {
      setSaving(true);
      await invoiceService.recordPayment(id, formData);
      toast.success('Payment recorded successfully');
      navigate(`/invoices/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!invoice) return null;

  const dueAmount = invoice.grandTotal - (invoice.paidAmount || 0);

  if (invoice.paymentStatus === 'Paid') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          This invoice is already fully paid.
        </Alert>
        <Button
          sx={{ mt: 2 }}
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/invoices/${id}`)}
        >
          Back to Invoice
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(`/invoices/${id}`)}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">
          Record Payment - {invoice.invoiceNumber}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Payment Details
            </Typography>

            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Payment Amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Payment Date"
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    select
                    label="Payment Method"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                  >
                    {paymentMethods.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Reference Number"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({...formData, referenceNumber: e.target.value})}
                    placeholder="Cheque/Transaction/UPI ID"
                  />
                </Grid>

                {(formData.paymentMethod === 'Cheque' || formData.paymentMethod === 'Bank Transfer' || formData.paymentMethod === 'DD') && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Bank Name"
                        value={formData.bankName}
                        onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Branch"
                        value={formData.branch}
                        onChange={(e) => setFormData({...formData, branch: e.target.value})}
                      />
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate(`/invoices/${id}`)}
                    >
                      Cancel
                    </Button>
                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      color="primary"
                      startIcon={<PaymentIcon />}
                      disabled={saving}
                    >
                      {saving ? 'Recording...' : 'Record Payment'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Invoice Summary
              </Typography>

              <Box sx={{ mt: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Invoice Number:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right" fontWeight="bold">
                      {invoice.invoiceNumber}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      School:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right">
                      {invoice.school?.name}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Period:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right">
                      {invoice.month}/{invoice.year}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Invoice Total:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right" fontWeight="bold">
                      {formatCurrency(invoice.grandTotal)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Already Paid:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right" color="success.main">
                      {formatCurrency(invoice.paidAmount || 0)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="h6">
                      Due Amount:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6" align="right" color="error.main">
                      {formatCurrency(dueAmount)}
                    </Typography>
                  </Grid>

                  {invoice.paidAt && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Last Payment:
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" align="right">
                          {format(new Date(invoice.paidAt), 'dd/MM/yyyy')}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InvoicePayment;