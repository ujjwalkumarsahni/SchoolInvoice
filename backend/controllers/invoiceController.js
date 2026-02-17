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

// @desc    Auto-generate invoices for previous month
// @route   POST /api/invoices/auto-generate
// @access  Private/Admin (Called by cron job)
export const autoGenerateInvoices = asyncHandler(async (req, res) => {
  const { manualMonth, manualYear } = req.body || {};
  let month, year;

  // ===== MANUAL MODE =====
  if (manualMonth && manualYear) {
    month = manualMonth - 1; // JS month 0-based
    year = manualYear;
  }
  // ===== AUTO/CRON MODE =====
  else {
    const today = new Date();

    if (today.getDate() !== 1) {
      return res.status(400).json({
        success: false,
        message: "Provide manualMonth & manualYear for mid-month generation",
      });
    }

    month = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
    year =
      today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  }

  const schools = await School.find({ status: "active" });
  const generatedInvoices = [];

  for (const school of schools) {
    const alreadyExists = await Invoice.findOne({
      school: school._id,
      month: month + 1,
      year,
    });

    if (alreadyExists) {
      console.log(`Invoice already exists for ${school.name}`);
      continue; // skip this school only
    }
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const postings = await EmployeePosting.find({
      school: school._id,
      isActive: true,
      $or: [
        { startDate: { $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
      ],
    }).populate({
      path: "employee",
      select: "basicInfo.fullName basicInfo.employeeId",
    });

    if (!postings.length) continue;

    // Holidays
    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate },
    });

    const holidayDates = holidays.map(
      (h) => h.date.toISOString().split("T")[0],
    );

    const daysInMonth = endDate.getDate();
    const workingDays = daysInMonth - holidayDates.length;

    const items = [];
    let subtotal = 0;
    let totalTds = 0;
    let totalGst = 0;

    for (const posting of postings) {
      // ===== BILLABLE PERIOD (JOIN/EXIT PRORATION) =====
      const billableStart = new Date(
        Math.max(new Date(posting.startDate), startDate),
      );

      const billableEnd = posting.endDate
        ? new Date(Math.min(new Date(posting.endDate), endDate))
        : endDate;

      // Total billable days in month
      const billableDays =
        Math.floor((billableEnd - billableStart) / (1000 * 60 * 60 * 24)) + 1;

      if (billableDays <= 0) continue;

      // Leaves
      const leaves = await Leave.find({
        employee: posting.employee._id,
        fromDate: { $lte: endDate },
        toDate: { $gte: startDate },
        status: "Approved",
      });

      let leaveDays = 0;

      leaves.forEach((leave) => {
        const leaveStart = new Date(Math.max(leave.fromDate, billableStart));

        const leaveEnd = new Date(Math.min(leave.toDate, billableEnd));

        for (
          let d = new Date(leaveStart);
          d <= leaveEnd;
          d.setDate(d.getDate() + 1)
        ) {
          const dateStr = d.toISOString().split("T")[0];
          if (!holidayDates.includes(dateStr)) leaveDays++;
        }
      });

      const actualWorkingDays = Math.max(0, billableDays - leaveDays);

      // ⭐ Correct daily rate (based on working days)
      const dailyRate = posting.monthlyBillingSalary / daysInMonth;

      const proratedAmount = Math.round(dailyRate * actualWorkingDays);

      const tdsAmount = Math.round(
        (proratedAmount * (posting.tdsPercent || 0)) / 100,
      );

      const gstAmount = Math.round(
        (proratedAmount * (posting.gstPercent || 0)) / 100,
      );

      const item = {
        employee: posting.employee._id,
        employeeName: posting.employee.basicInfo.fullName,
        employeeId: posting.employee.basicInfo.employeeId,
        monthlyBillingSalary: posting.monthlyBillingSalary,
        leaveDays,
        leaveDeduction: Math.round(dailyRate * leaveDays),
        workingDays: billableDays,
        actualWorkingDays,
        proratedAmount,
        tdsPercent: posting.tdsPercent || 0,
        tdsAmount,
        gstPercent: posting.gstPercent || 0,
        gstAmount,
        subtotal: proratedAmount,
      };

      items.push(item);

      subtotal += proratedAmount;
      totalTds += tdsAmount;
      totalGst += gstAmount;
    }

    // ===== GET PREVIOUS DUE =====
    const prevInvoice = await Invoice.findOne({
      school: school._id,
      paymentStatus: { $in: ["Partial", "Unpaid"] },
    }).sort({ createdAt: -1 });

    let previousDue = 0;

    if (prevInvoice) {
      previousDue = prevInvoice.grandTotal - (prevInvoice.paidAmount || 0);
    }

    // ===== FINAL TOTAL =====
    const grandTotal = subtotal - totalTds + totalGst + previousDue;

    const invoice = await Invoice.create({
      school: school._id,
      schoolDetails: {
        name: school.name,
        city: school.city,
        address: school.address,
        contactPersonName: school.contactPersonName,
        mobile: school.mobile,
        email: school.email,
      },
      month: month + 1,
      year,
      items,
      subtotal,
      previousDue,
      tdsAmount: totalTds,
      gstAmount: totalGst,
      grandTotal,
      status: "Generated",
      generatedBy: req.user?._id,
      generatedAt: new Date(),
    });

    // Ledger
    await SchoolLedger.create({
      school: school._id,
      invoice: invoice._id,
      transactionType: "Invoice Generated",
      amount: grandTotal,
      balance: grandTotal,
      month: month + 1,
      year,
      description: `Invoice for ${month + 1}/${year}`,
      createdBy: req.user?._id,
    });

    generatedInvoices.push(invoice);
  }

  res.status(201).json({
    success: true,
    message: `Generated ${generatedInvoices.length} invoices`,
    data: generatedInvoices,
  });
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
          originalItem.monthlyBillingSalary / invoice.daysInMonth;
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
    status: { $in: ["Verified", "Sent"] },
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
  const newPaidAmount = invoice.paidAmount + amount;

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
