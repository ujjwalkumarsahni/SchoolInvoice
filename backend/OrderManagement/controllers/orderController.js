import asyncHandler from "express-async-handler";
import Order from "../models/Order.js";
import School from "../models/School.js";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

export const createOrder = asyncHandler(async (req, res) => {
  const {
    school,
    academicYear,
    orderItems,
    kitItems,
    discountPercentage,
    discountAmount,
    gstPercentage,
    gstAmount,
    toAddress,
  } = req.body;

  // Validate school
  const schoolData = await School.findById(school);
  if (!schoolData) {
    res.status(404);
    throw new Error("School not found");
  }

  // Check for existing active order
  const existingOrder = await Order.findOne({
    school,
    $or: [
      { paymentStatus: { $ne: "paid" } },
      { dispatchStatus: { $ne: "delivered" } },
    ],
  });

  if (existingOrder) {
    res.status(400);
    throw new Error("School already has an active order");
  }

  // Validate items
  const hasValidOrderItems = Array.isArray(orderItems) && orderItems.length > 0;
  const hasValidKitItems = Array.isArray(kitItems) && kitItems.length > 0;

  if (!hasValidOrderItems && !hasValidKitItems) {
    res.status(400);
    throw new Error("At least one book or kit is required");
  }

  // Calculate totals
  const calculateItemTotal = (items) => {
    return items.reduce((sum, item) => {
      const total = item.quantity * item.unitPrice;
      return sum + total;
    }, 0);
  };

  const orderItemsWithTotals = orderItems.map((item) => ({
    ...item,
    totalPrice: item.quantity * item.unitPrice,
  }));

  const kitItemsWithTotals = kitItems
    ? kitItems.map((item) => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice,
      }))
    : [];

  const orderItemsTotal = calculateItemTotal(orderItems);
  const kitItemsTotal = calculateItemTotal(kitItems || []);
  const subtotal = orderItemsTotal + kitItemsTotal;

  // Calculate discount amount from percentage if not provided
  let finalDiscountAmount = discountAmount || 0;
  if (discountPercentage) {
    finalDiscountAmount = (discountPercentage / 100) * subtotal;
  }

  const totalAmount = subtotal - finalDiscountAmount;

  if (totalAmount < 0) {
    res.status(400);
    throw new Error("Discount cannot be greater than total amount");
  }

  // Create order
  const order = await Order.create({
    school,
    schoolName: schoolData.name,
    academicYear,
    orderItems: orderItemsWithTotals,
    kitItems: kitItemsWithTotals,
    discountPercentage: discountPercentage || 0,
    discount: finalDiscountAmount,

    // GST optional
    ...(gstPercentage && { gstPercentage }),
    ...(gstAmount && { gstAmount }),

    subtotal,
    totalAmount,
    toAddress: {
      ...toAddress,
      name: toAddress.name || schoolData.contactPersonName,
      mobile: toAddress.mobile || schoolData.mobile,
      email: toAddress.email || schoolData.email,
      address: toAddress.address || schoolData.address,
      city: toAddress.city || schoolData.city,
    },
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  const populatedOrder = await Order.findById(order._id)
    .populate("school", "name city address contactPersonName mobile email")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(201).json({
    success: true,
    data: populatedOrder,
  });
});

// Get all orders
export const getOrders = asyncHandler(async (req, res) => {
  const {
    school,
    academicYear,
    paymentStatus,
    dispatchStatus,
    startDate,
    endDate,
    search,
  } = req.query;

  let query = {};

  if (school) query.school = school;
  if (academicYear) query.academicYear = academicYear;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (dispatchStatus) query.dispatchStatus = dispatchStatus;

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Search by invoice number or school name
  if (search) {
    query.$or = [
      { invoiceNumber: new RegExp(search, "i") },
      { schoolName: new RegExp(search, "i") },
    ];
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .populate("school", "name city")
    .populate("createdBy", "name email")
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);

  const total = await Order.countDocuments(query);

  // Add virtuals to response
  const ordersWithVirtuals = orders.map((order) => ({
    ...order.toObject(),
    isEditable:
      order.dispatchStatus === "pending" ||
      order.dispatchStatus === "processing",
  }));

  res.json({
    success: true,
    count: orders.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
    data: ordersWithVirtuals,
  });
});

// Get single order
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("school", "name city address contactPersonName mobile email")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .populate("dispatchedBy", "name email");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const orderData = {
    ...order.toObject(),
    // UPDATED: Editable only when dispatch status is "pending"
    isEditable: order.dispatchStatus === "pending",
  };

  res.json({
    success: true,
    data: orderData,
  });
});

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private/Admin/HR
export const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Check if order is editable
  if (
    !(
      order.dispatchStatus === "pending" ||
      order.dispatchStatus === "processing"
    )
  ) {
    res.status(400);
    throw new Error("Cannot edit dispatched/delivered order");
  }

  const { orderItems, kitItems, discount, toAddress } = req.body;

  // Calculate new totals
  const calculateItemTotal = (items) => {
    return items.reduce((sum, item) => {
      const total = item.quantity * item.unitPrice;
      return sum + total;
    }, 0);
  };

  const orderItemsWithTotals = orderItems.map((item) => ({
    ...item,
    totalPrice: item.quantity * item.unitPrice,
  }));

  const kitItemsWithTotals = kitItems
    ? kitItems.map((item) => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice,
      }))
    : [];

  const orderItemsTotal = calculateItemTotal(orderItems);
  const kitItemsTotal = calculateItemTotal(kitItems || []);
  const subtotal = orderItemsTotal + kitItemsTotal;
  const totalAmount = subtotal - (discount || 0);

  if (totalAmount < 0) {
    res.status(400);
    throw new Error("Discount cannot be greater than total amount");
  }

  // Update order
  order.orderItems = orderItemsWithTotals;
  order.kitItems = kitItemsWithTotals;
  order.discount = discount || 0;
  order.subtotal = subtotal;
  order.totalAmount = totalAmount;

  if (toAddress) {
    order.toAddress = {
      ...order.toAddress,
      ...toAddress,
    };
  }

  order.updatedBy = req.user._id;

  await order.save();

  const updatedOrder = await Order.findById(order._id)
    .populate("school", "name city address contactPersonName mobile email")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.json({
    success: true,
    data: updatedOrder,
  });
});

// Update payment status
export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paidAmount, paymentMethod, notes, paymentStatus } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) throw new Error("Order not found");

  // Validate state transitions
  if (paymentStatus === "pending") {
    // Cannot go back to pending if already paid/partial
    if (order.paymentStatus !== "pending") {
      throw new Error("Cannot revert to pending once payment has been made");
    }

    order.paidAmount = 0;
    order.remainingAmount = order.totalAmount;
    order.paymentStatus = "pending";
    order.paymentDate = null;
    order.paymentMethod = null;
    order.updatedBy = req.user._id;

    await order.save();
    return res.json({ success: true, data: order });
  }

  // For "paid" status - validation
  if (paymentStatus === "paid") {
    // Cannot mark as paid if already paid
    if (order.paymentStatus === "paid") {
      throw new Error("Order is already paid");
    }

    const amount = Number(paidAmount);
    if (!amount || amount <= 0) {
      throw new Error("Valid paid amount required");
    }

    // For marking as paid, amount should be remaining balance
    if (amount < order.remainingAmount) {
      throw new Error(
        `To mark as paid, amount must be at least ${order.remainingAmount}`,
      );
    }

    // Cap amount at remaining balance
    const actualAmount = Math.min(amount, order.remainingAmount);

    // Add to history
    order.paymentHistory.push({
      amount: actualAmount,
      method: paymentMethod || "cash",
      notes,
      receivedBy: req.user._id,
      date: new Date(),
    });

    // Update amounts
    order.paidAmount += actualAmount;
    order.remainingAmount = order.totalAmount - order.paidAmount;
    order.paymentStatus = "paid";
    order.paymentMethod = paymentMethod;
    order.paymentDate = new Date();
    order.updatedBy = req.user._id;

    await order.save();
    return res.json({ success: true, data: order });
  }

  // For "partial" status - validation
  if (paymentStatus === "partial") {
    // Cannot go to partial if already paid
    if (order.paymentStatus === "paid") {
      throw new Error("Cannot change to partial once order is fully paid");
    }

    const amount = Number(paidAmount);
    if (!amount || amount <= 0) {
      throw new Error("Valid paid amount required");
    }

    // Prevent overpayment
    if (amount > order.remainingAmount) {
      throw new Error(
        `Amount cannot exceed remaining balance of ${order.remainingAmount}`,
      );
    }

    // Add to history
    order.paymentHistory.push({
      amount,
      method: paymentMethod || "cash",
      notes,
      receivedBy: req.user._id,
      date: new Date(),
    });

    // Update amounts
    order.paidAmount += amount;
    order.remainingAmount = order.totalAmount - order.paidAmount;

    // Auto-check if becomes paid
    if (order.remainingAmount <= 0) {
      order.paymentStatus = "paid";
      order.paidAmount = order.totalAmount; // Ensure exact match
      order.remainingAmount = 0;
    } else {
      order.paymentStatus = "partial";
    }

    order.paymentMethod = paymentMethod;
    order.paymentDate = new Date();
    order.updatedBy = req.user._id;

    await order.save();
    return res.json({ success: true, data: order });
  }

  // If no status specified, use default logic
  const amount = Number(paidAmount);
  if (!amount || amount <= 0) {
    throw new Error("Valid paid amount required");
  }

  if (amount > order.remainingAmount) {
    throw new Error("Amount exceeds remaining balance");
  }

  order.paymentHistory.push({
    amount,
    method: paymentMethod || "cash",
    notes,
    receivedBy: req.user._id,
    date: new Date(),
  });

  order.paidAmount += amount;
  order.remainingAmount = order.totalAmount - order.paidAmount;

  if (order.remainingAmount <= 0) {
    order.paymentStatus = "paid";
  } else {
    order.paymentStatus = "partial";
  }

  order.paymentMethod = paymentMethod;
  order.paymentDate = new Date();
  order.updatedBy = req.user._id;

  await order.save();
  res.json({ success: true, data: order });
});

// @desc    Dispatch order
// @route   PATCH /api/orders/:id/dispatch
// @access  Private/Admin/HR
export const dispatchOrder = asyncHandler(async (req, res) => {
  const { dispatchStatus, notes, fromAddress, receiverName } = req.body;

  if (
    (dispatchStatus === "dispatched" || dispatchStatus === "delivered") &&
    !receiverName
  ) {
    res.status(400);
    throw new Error("Receiver name is required");
  }

  if (!["pending", "dispatched", "delivered"].includes(dispatchStatus)) {
    res.status(400);
    throw new Error("Invalid dispatch status");
  }

  const existingOrder = await Order.findById(req.params.id);

  if (!existingOrder) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (
    dispatchStatus === "delivered" &&
    existingOrder.dispatchStatus !== "dispatched"
  ) {
    res.status(400);
    throw new Error("Order must be dispatched first");
  }

  const updateData = {
    dispatchStatus,
    notes,
    updatedBy: req.user._id,
  };

  if (dispatchStatus === "dispatched") {
    updateData.dispatchedAt = new Date();
    updateData.dispatchedBy = req.user._id;
    updateData["dispatchDetails.dispatchedTo"] = receiverName;
  }

  if (dispatchStatus === "delivered") {
    updateData.deliveredAt = new Date();
    updateData["dispatchDetails.deliveredTo"] = receiverName;
  }

  if (fromAddress) {
    updateData.fromAddress = fromAddress;
  }

  const order = await Order.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("school", "name city address contactPersonName mobile email")
    .populate("dispatchedBy", "name email")
    .populate("updatedBy", "name email");

  res.json({
    success: true,
    data: order,
  });
});

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private/Admin/HR
export const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Check if order can be deleted
  if (order.dispatchStatus !== "pending") {
    res.status(400);
    throw new Error("Cannot delete order that has been processed");
  }

  await order.deleteOne();

  res.json({
    success: true,
    message: "Order deleted successfully",
  });
});

// @desc    Get order statistics
// @route   GET /api/orders/dashboard/stats
// @access  Private/Admin/HR
export const getOrderStats = asyncHandler(async (req, res) => {
  const { academicYear } = req.query;

  let query = {};
  if (academicYear) query.academicYear = academicYear;

  const currentYear = new Date().getFullYear();
  const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;

  const yearToUse = academicYear || defaultAcademicYear;

  const [
    totalOrders,
    pendingPayment,
    paidOrders,
    pendingDispatch,
    dispatchedOrders,
    totalRevenue,
    ordersByBookType,
  ] = await Promise.all([
    Order.countDocuments({ academicYear: yearToUse }),
    Order.countDocuments({ academicYear: yearToUse, paymentStatus: "pending" }),
    Order.countDocuments({ academicYear: yearToUse, paymentStatus: "paid" }),
    Order.countDocuments({
      academicYear: yearToUse,
      dispatchStatus: "pending",
    }),
    Order.countDocuments({
      academicYear: yearToUse,
      dispatchStatus: "dispatched",
    }),
    Order.aggregate([
      { $match: { academicYear: yearToUse } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([
      { $match: { academicYear: yearToUse } },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.bookType",
          count: { $sum: "$orderItems.quantity" },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      academicYear: yearToUse,
      totalOrders,
      paymentStats: {
        pending: pendingPayment,
        paid: paidOrders,
        partial: totalOrders - pendingPayment - paidOrders,
      },
      dispatchStats: {
        pending: pendingDispatch,
        dispatched: dispatchedOrders,
        delivered: totalOrders - pendingDispatch - dispatchedOrders,
      },
      revenue: totalRevenue[0]?.total || 0,
      booksByType: ordersByBookType.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    },
  });
});

const PAGE_BOTTOM = 780;

// ================= PAGE BREAK HELPER =================
const checkPageBreak = (doc, currentY, needed = 20) => {
  if (currentY + needed > PAGE_BOTTOM) {
    doc.addPage();
    drawTemplate(doc);
    return 120;
  }
  return currentY;
};

// ================= TEMPLATE =================
const drawTemplate = (doc) => {
  const logoPath = path.join(
    process.cwd(),
    "OrderManagement/assets/aaklan-logo.png",
  );
 doc.font("Noto");
  doc.fillColor("#000");
  // Header
  doc.image(logoPath, 10, 10, { width: 120 });

  // Company Name Bold
doc
  .font("Noto-Bold")
  .fontSize(12)
  .fillColor("#000")
  .text("Aaklan IT Solutions Pvt. Ltd.", 400, 15);

// Address Normal
doc
  .font("Noto")
  .fontSize(10)
  .text("IT-9(A), EPIP, IT Park Road, Sitapura", 400, 28)
  .text("Jaipur, Rajasthan - 302022", 400, 38);

  // ===== EXACT MATCH HEADER BAR =====

  // 1) Orange base line
  doc.rect(0, 55, 595, 10).fill("#F4A300");

  // 2) Blue block (right)
  doc.rect(520, 55, 75, 10).fill("#1F2A44");

  // 3) Slanted orange stripes
  const stripeY = 55;
  const stripeHeight = 10;
  const stripeWidth = 10;

  for (let i = 0; i < 4; i++) {
    const startX = 470 + i * 12;

    doc
      .polygon(
        [startX, stripeY],
        [startX + stripeWidth, stripeY],
        [startX + stripeWidth - 4, stripeY + stripeHeight],
        [startX - 4, stripeY + stripeHeight],
      )
      .fill("#F4A300");
  }

  // ===== PREMIUM FOOTER =====

  const h = doc.page.height;

  // Orange top strip
  doc.rect(0, h - 52, 595, 18).fill("#F4A300");

  // Blue footer background
  doc.rect(0, h - 40, 595, 40).fill("#1F2A44");

  // White text styling
  doc.fillColor("#fff");

  // Row 1 (CIN & PAN)
  doc
    .fontSize(8)
    .text("CIN: U72900RJ2021PTC072389", 20, h - 32)
    .text("PAN: AAUCA6196N", 450, h - 32, { align: "right", width: 125 });

  // Row 2 (contact info centered)
  doc
    .fontSize(9)
    .text(
      "+91 9571677609   |   www.aaklan.com   |   support@aaklan.com",
      0,
      h - 18,
      {
        width: 595,
        align: "center",
      },
    );

};

// ================= TABLE HEADER =================
const drawTableHeaders = (doc, y) => {
  const startX = 20;
  const tableWidth = 555;

  doc.rect(startX, y, tableWidth, 22).fill("#0F172A");

  doc.font("Noto-Bold").fillColor("#fff").fontSize(9);

  // SAME grid as rows
  doc.text("Sr. No.", startX + 5, y + 5, {
    width: 40,
    align: "center",
  });

  doc.text("Item Description", startX + 55, y + 5, {
    width: 210,
    align: "center",
  });

  doc.text("Quantity", startX + 275, y + 5, {
    width: 60,
    align: "center",
  });

  doc.text("Unit Price", startX + 355, y + 5, {
    width: 70,
    align: "center",
  });

  doc.text("Amount", startX + 440, y + 5, {
    width: 80,
    align: "center",
  });

  doc.font("Noto");
};

// ================= MAIN CONTENT =================
const drawInvoiceContent = (doc, order) => {
  doc.font("Noto");
  doc.fillColor("#000");
  const startX = 20; // table left align
  const tableWidth = 555;

  let y = 80;

  // --------- BILL FROM ----------
  doc.font("Noto-Bold").fontSize(10).text("BILL FROM:", startX, y);
  doc.font("Noto"); // reset

  y += 15;

  doc
    .fontSize(9)
    .text("Aaklan IT Solutions Pvt. Ltd.", startX, y)
    .text("IT-9(A), EPIP, IT Park Road, Sitapura", startX, (y += 12))
    .text("Jaipur, Rajasthan - 302022", startX, (y += 12))
    .text("Mobile: +91 9571677609", startX, (y += 12))
    .text("Email: support@aaklan.com", startX, (y += 12));

  // --------- BILL TO ----------
  let billToY = 80;

  const billToX = 200;

  doc.font("Noto-Bold").fontSize(10).text("BILL TO:", billToX, billToY);
  doc.font("Noto");

  billToY += 15;

  doc
    .fontSize(9)
    .text(order.school.name, billToX, billToY)
    .text(order.school.address, billToX, (billToY += 12))
    .text(order.school.city, billToX, (billToY += 12))
    .text(`Mobile: ${order.school.mobile}`, billToX, (billToY += 12))
    .text(`Email: ${order.school.email}`, billToX, (billToY += 12));

  // --------- INVOICE INFO ----------
  let infoY = 80;

  const invoiceX = 400;

  doc
    .font("Noto-Bold")
    .fontSize(10)
    .text(`Invoice No: ${order.invoiceNumber}`, invoiceX, infoY, {
      width: 170,
      align: "right",
    });

  doc
    .font("Noto")
    .text(`Date: ${new Date().toLocaleDateString()}`, invoiceX, infoY + 15, {
      width: 170,
      align: "right",
    });

  // --------- TABLE ----------
  // COLUMN POSITIONS
  const colX = {
    sr: startX,
    desc: startX + 50,
    qty: startX + 270,
    price: startX + 350,
    amount: startX + 450,
  };

  const rowHeight = 20;

  y = Math.max(y, billToY) + 40;

  drawTableHeaders(doc, y);
  doc
    .moveTo(startX, y)
    .lineTo(startX + tableWidth, y)
    .stroke();

  y += 22;

  let i = 1;

  const drawRow = (desc, qty, price, total) => {
    y = checkPageBreak(doc, y, rowHeight);

    doc.fontSize(9).fillColor("#000");

    // Alternate row color (optional but nice)
    if (i % 2 === 0) {
      doc.rect(startX, y, tableWidth, rowHeight).fill("#EEF2F7");
      doc.fillColor("#000");
    }

    // TEXT
    doc.text(i, colX.sr + 5, y + 5, { width: 40, align: "center" });
    doc.text(desc, colX.desc + 5, y + 5, { width: 210 });
    doc.text(qty, colX.qty + 5, y + 5, { width: 60, align: "center" });
    doc.text(`₹ ${price}`, colX.price + 5, y + 5, {
      width: 70,
      align: "right",
    });
    doc.text(`₹ ${total}`, colX.amount + 5, y + 5, {
      width: 80,
      align: "right",
    });

    // ROW BORDER
    doc.rect(startX, y, tableWidth, rowHeight).stroke();

    // COLUMN LINES
    doc
      .moveTo(colX.desc, y)
      .lineTo(colX.desc, y + rowHeight)
      .stroke();
    doc
      .moveTo(colX.qty, y)
      .lineTo(colX.qty, y + rowHeight)
      .stroke();
    doc
      .moveTo(colX.price, y)
      .lineTo(colX.price, y + rowHeight)
      .stroke();
    doc
      .moveTo(colX.amount, y)
      .lineTo(colX.amount, y + rowHeight)
      .stroke();

    y += rowHeight;
    i++;
  };

  order.orderItems?.forEach((it) => {
    const desc = it.bookName
      ? `${it.bookType} - ${it.bookName} (${it.grade})`
      : `${it.bookType} (${it.grade})`;

    drawRow(
      desc,
      it.quantity,
      it.unitPrice.toFixed(2),
      it.totalPrice.toFixed(2),
    );
  });

  order.kitItems?.forEach((k) => {
    drawRow(
      `${k.kitType} - ${k.kitName}`,
      k.quantity,
      k.unitPrice.toFixed(2),
      k.totalPrice.toFixed(2),
    );
  });
  const subtotal = order.subtotal || 0;
  const discount = order.discount || 0;
  // GST from DB (optional)
  const gst = order.gstAmount || 0;
  const grand = subtotal - discount + gst;

  // --------- TOTALS TABLE ----------
  const totalsX = startX + tableWidth - 250;
  const totalsWidth = 250;
  const rowH = 22;

  const drawTotalRow = (label, value, bold = false) => {
    doc.rect(totalsX, y, totalsWidth, rowH).stroke();

    // Label
    doc
      .font(bold ? "Noto-Bold" : "Noto")
      .fontSize(bold ? 11 : 10)
      .fillColor("#000")
      .text(label, totalsX + 10, y + 6);

    // Value (separate font set)
    doc
      .font(bold ? "Noto-Bold" : "Noto")
      .text(`₹ ${value.toFixed(2)}`, totalsX, y + 6, {
        width: totalsWidth - 10,
        align: "right",
      });

    y += rowH;
  };

  drawTotalRow("Subtotal", subtotal);

  // ===== Discount % calculation =====
  let discountPercent = 0;

  if (subtotal > 0 && discount > 0) {
    discountPercent = Math.round((discount / subtotal) * 100);
  }

  // Show discount only if exists
  if (discount > 0) {
    drawTotalRow(`Discount (${discountPercent}%)`, discount);
  }

  // ===== GST optional =====
  if (gst > 0) {
    drawTotalRow(`GST (${order.gstPercentage || 18}%)`, gst);
  }

  // Grand total from DB (best practice)
  drawTotalRow("Grand Total", order.totalAmount, true);

  y += 10;

  // Check space before bank details
  if (y + 160 > PAGE_BOTTOM) {
    doc.addPage();
    drawTemplate(doc);
    y = 120;
  }

  // --------- BANK DETAILS (LEFT SIDE) ----------
  const bankY = y;

  // Heading bold
  doc
    .font("Noto-Bold")
    .fontSize(10)
    .fillColor("#0F172A")
    .text("Company Bank Details", startX, bankY);
  doc.font("Noto").fontSize(9).fillColor("#000");

  // Account Holder
  doc
    .font("Noto")
    .text("Account Holder: ", startX, bankY + 15, { continued: true })
    .font("Noto-Bold")
    .text("Aaklan It Solutions Pvt. Ltd.");

  // Account Number
  doc
    .font("Noto")
    .text("Account Number: ", startX, bankY + 28, { continued: true })
    .font("Noto-Bold")
    .text("50200062871746");

  // IFSC
  doc
    .font("Noto")
    .text("IFSC: ", startX, bankY + 41, { continued: true })
    .font("Noto-Bold")
    .text("HDFC0005306");

  // Branch
  doc
    .font("Noto")
    .text("Branch: ", startX, bankY + 54, { continued: true })
    .font("Noto-Bold")
    .text("NIRMAN NAGAR");

  // Account Type
  doc
    .font("Noto")
    .text("Account Type: ", startX, bankY + 67, { continued: true })
    .font("Noto-Bold")
    .text("CURRENT");

  // UPI
  doc
    .font("Noto")
    .text("UPI: ", startX, bankY + 80, { continued: true })
    .font("Noto-Bold")
    .text("9660997790@hdfcbank");

  // Reset font
  doc.font("Noto");

  // --------- SIGNATURE ----------
  let signatureY = bankY + 120;
  if (signatureY > doc.page.height - 140) {
    doc.addPage();
    drawTemplate(doc);
    signatureY = 120;
  }

  doc
    .font("Noto-Bold")
    .fontSize(10)
    .text("For Aaklan IT Solutions Pvt. Ltd.", startX + 30, signatureY)
    .moveTo(startX + 30, signatureY + 25)
    .lineTo(startX + 180, signatureY + 25)
    .stroke()
    .fontSize(8)
    .text("Authorized Signatory", startX + 70, signatureY + 30);

  doc
    .font("Noto-Bold")
    .fontSize(10)
    .text(`For ${order.school.name}`, startX + 350, signatureY)
    .moveTo(startX + 350, signatureY + 25)
    .lineTo(startX + 500, signatureY + 25)
    .stroke()
    .fontSize(8)
    .text("Authorized Signatory", startX + 390, signatureY + 30);
};

// ================= CONTROLLER =================
export const generateInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("school");

  const doc = new PDFDocument({ margin: 0, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=invoice.pdf`);

  doc.pipe(res);

// REGISTER FONTS FIRST
doc.registerFont(
  "Noto",
  path.join(process.cwd(),"OrderManagement/assets/fonts/NotoSans-Regular.ttf")
);

doc.registerFont(
  "Noto-Bold",
  path.join(process.cwd(),"OrderManagement/assets/fonts/NotoSans-Bold.ttf")
);

drawTemplate(doc);
drawInvoiceContent(doc, order);

  doc.end();
});










// // // offarffer letter template 
// const drawTemplate = (doc) => {
//   try {
//     const logoPath = path.join(
//       process.cwd(),
//       "OrderManagement/assets/aaklan-logo.png",
//     );

//     const MARGIN = 30;
//     const PAGE_WIDTH = doc.page.width;
//     const PAGE_HEIGHT = doc.page.height;
//     const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

//     doc.save();
//     doc.fillColor("#000").font("Noto");

//     // ===== LOGO =====
//     if (fs.existsSync(logoPath)) {
//       doc.image(logoPath, 15, 15, { width: 120 });
//     } else {
//       doc.font("Noto-Bold").fontSize(14).text("Aaklan IT Solutions", 15, 25);
//     }

//     // ===== COMPANY TEXT (RIGHT ALIGN) =====
//     doc
//       .font("Noto-Bold")
//       .fontSize(12)
//       .text("Aaklan IT Solutions Pvt. Ltd.", MARGIN, 15, {
//         width: CONTENT_WIDTH,
//         align: "right",
//       });

//     doc
//       .font("Noto")
//       .fontSize(10)
//       .text("IT-9(A), EPIP, IT Park Road, Sitapura", MARGIN, 30, {
//         width: CONTENT_WIDTH,
//         align: "right",
//       })
//       .text("Jaipur, Rajasthan - 302022", MARGIN, 42, {
//         width: CONTENT_WIDTH,
//         align: "right",
//       });

//     // ===== HEADER BAR (IMAGE STYLE) =====

//     // Main orange bar
//     doc.rect(0, 60, PAGE_WIDTH, 12).fill("#F4A300");

//     // Dark blue right block
//     const blueWidth = 90;
//     doc.rect(PAGE_WIDTH - blueWidth, 60, blueWidth, 12).fill("#1F2A44");

//     // Slanted stripes before blue block
//     const stripeWidth = 12;
//     const gap = 6;
//     let stripeX = PAGE_WIDTH - blueWidth - 60;

//     for (let i = 0; i < 4; i++) {
//       doc
//         .polygon(
//           [stripeX, 60],
//           [stripeX + stripeWidth, 60],
//           [stripeX + stripeWidth - 6, 72],
//           [stripeX - 6, 72],
//         )
//         .fill("#F4A300");

//       stripeX += stripeWidth + gap;
//     }

//     // ================= FOOTER =================

//     // Top orange strip
//     doc.rect(0, PAGE_HEIGHT - 50, PAGE_WIDTH, 15).fill("#F4A300");

//     // Disclaimer text
//     doc
//       .fontSize(8)
//       .fillColor("#fff")
//       .text(
//         "*This is a system-generated document for review. Final validity requires company signature and stamp",
//         MARGIN,
//         PAGE_HEIGHT - 45,
//         { align: "center", width: CONTENT_WIDTH },
//       );

//     // Dark footer background
//     doc.rect(0, PAGE_HEIGHT - 35, PAGE_WIDTH, 35).fill("#1F2A44");

//     // Footer text
//     doc.fillColor("#fff").fontSize(9);

//     doc.text("CIN: U72900RJ2021PTC072389", MARGIN, PAGE_HEIGHT - 28);

//     doc.text("PAN: AAUCA6196N", MARGIN, PAGE_HEIGHT - 28, {
//       width: CONTENT_WIDTH,
//       align: "right",
//     });

//     doc.text(
//       "+91 9571677609 | www.aaklan.com | hr@aaklan.com",
//       0,
//       PAGE_HEIGHT - 15,
//       { align: "center", width: PAGE_WIDTH },
//     );

//     doc.restore();
//   } catch (error) {
//     console.log("Error in drawTemplate:", error.message);
//   }
// };

// export const generateOfferLetterPDF = async (applicant, offerData) => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       const fileName = `Offer_Letter_${(applicant?.name || "Applicant").replace(/\s+/g, "_")}_${Date.now()}.pdf`;
//       const filePath = path.join(process.cwd(), "temp", fileName);

//       if (!fs.existsSync("temp")) fs.mkdirSync("temp");

//       // CORRECTED: Don't use margins property - it doesn't exist in pdfkit
//       const doc = new PDFDocument({
//         size: "A4",
//         margin: 0, // Set margin to 0 and handle margins manually
//       });

//       doc.pipe(fs.createWriteStream(filePath));

//       doc.registerFont("Noto", "Helvetica");
//       doc.registerFont("Noto-Bold", "Helvetica-Bold");

//       // Draw template on first page
//       drawTemplate(doc);

//       // ===== PERFECT SYMMETRICAL MARGINS =====
//       const MARGIN = 25;
//       const CONTENT_X = MARGIN;
//       const CONTENT_WIDTH = 595 - MARGIN * 2; // A4 width is 595 points

//       // Set starting position after header
//       doc.y = 90; // Start below the header bar

//       // ===== TITLE =====
//       doc.font("Noto-Bold").fontSize(16);

//       const title = "OFFER LETTER";

//       // Measure text width
//       const textWidth = doc.widthOfString(title);

//       // Center position calculate
//       const centerX = doc.page.width / 2;
//       const startX = centerX - textWidth / 2;
//       const endX = centerX + textWidth / 2;

//       // Draw title
//       doc.text(title, 0, doc.y, { align: "center" });

//       // Line just below text
//       const lineY = doc.y - 5;

//       doc
//         .moveTo(startX, lineY)
//         .lineTo(endX, lineY)
//         .lineWidth(2)
//         .stroke("#F4A300");

//       doc.moveDown(1);

//       doc.font("Noto").fontSize(12);

//       // ===== Dear Name =====
//       doc.text("Dear ", CONTENT_X, doc.y, {
//         continued: true,
//         width: CONTENT_WIDTH,
//         align: "justify",
//       });
//       doc.font("Noto-Bold").text(offerData?.name || applicant?.name, {
//         width: CONTENT_WIDTH,
//         align: "justify",
//       });

//       doc.moveDown();

//       // ===== MAIN PARA =====
//       const role = offerData?.role || applicant?.appliedPosition;
//       const joinDate = new Date(
//         offerData?.dateOfJoining || applicant?.dateOfJoining,
//       ).toLocaleDateString("en-US", {
//         day: "numeric",
//         month: "long",
//         year: "numeric",
//       });

//       doc
//         .font("Noto")
//         .text(
//           "Congratulations! Further to your application as a ",
//           CONTENT_X,
//           doc.y,
//           {
//             continued: true,
//             width: CONTENT_WIDTH,
//             align: "justify",
//           },
//         );

//       doc.font("Noto-Bold").text(role + " ", {
//         continued: true,
//         width: CONTENT_WIDTH,
//         align: "justify",
//       });

//       doc
//         .font("Noto")
//         .text(
//           " with us and the subsequent selection process, we are delighted to offer you the role of ",
//           {
//             continued: true,
//             width: CONTENT_WIDTH,
//             align: "justify",
//           },
//         );

//       doc.font("Noto-Bold").text(role + " ", {
//         continued: true,
//         width: CONTENT_WIDTH,
//         align: "justify",
//       });

//       doc
//         .font("Noto")
//         .text(
//           " in our organization. As per the agreed terms, you have to work Monday to Saturday (9 AM - 5 PM). The location of your initial reporting will be at Aaklan IT Solution Pvt. Ltd, IT-9A Sitapura, Jaipur. Your joining date will be ",
//           {
//             continued: true,
//             width: CONTENT_WIDTH,
//             align: "justify",
//           },
//         );

//       doc.font("Noto-Bold").text(joinDate, {
//         continued: true,
//         width: CONTENT_WIDTH,
//         align: "justify",
//       });

//       doc
//         .font("Noto")
//         .text(
//           ". If you have any queries about your first day, send an email to hr@aaklan.com.",
//           { width: CONTENT_WIDTH, align: "justify", lineGap: 3 },
//         );

//       doc.moveDown();

//       // ===== DOCUMENTS =====
//       doc.text("On your joining date, please bring:", CONTENT_X, doc.y, {
//         width: CONTENT_WIDTH,
//         align: "justify",
//         lineGap: 3,
//       });

//       const documents = [
//         "1. Copy of offer letter duly signed and dated by you.",
//         "2. Self photographs (passport size, color with white background)",
//         "3. One set of printouts of the completed onboarding forms & Originals.",
//         "4. Aadhaar card xerox.",
//         "5. Relieving documents from the most recent employer. (if applicable)",
//         "6. Passport and Pan card xerox.",
//         "7. Relevant Education Documents.",
//         "8. Last 3 months pay/salary slip (if applicable).",
//         "9. Police Verification.",
//       ];

//       documents.forEach((line) => {
//         doc.text(line, CONTENT_X, doc.y, {
//           width: CONTENT_WIDTH,
//           align: "justify",
//           lineGap: 3,
//         });
//       });

//       doc.moveDown();

//       // ===== PROBATION =====
//       doc.text(
//         "You will be on probation until your successful completion of the probationary period is confirmed in writing. The normal probation period is ",
//         CONTENT_X,
//         doc.y,
//         {
//           continued: true,
//           width: CONTENT_WIDTH,
//           align: "justify",
//         },
//       );

//       doc.font("Noto-Bold").text(offerData?.probationPeriod + " ", {
//         continued: true,
//         width: CONTENT_WIDTH,
//         align: "justify",
//       });

//       doc
//         .font("Noto")
//         .text(
//           " but may be extended or confirmed earlier based on your performance and at your supervisor's discretion.",
//           { width: CONTENT_WIDTH, align: "justify", lineGap: 3 },
//         );

//       doc.moveDown();

//       // ===== SALARY =====
//       doc.text("Your CTC Salary shall be Rs.", CONTENT_X, doc.y, {
//         continued: true,
//         width: CONTENT_WIDTH,
//         align: "justify",
//       });

//       // Format salary with commas
//       const formattedSalary = offerData?.netSalary
//         ? offerData.netSalary.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
//         : "1";

//       doc.font("Noto-Bold").text(formattedSalary, {
//         continued: true,
//         width: CONTENT_WIDTH,
//         align: "justify",
//       });

//       doc
//         .font("Noto")
//         .text("/- per month Your individual remuneration is strictly confidential.", {
//           width: CONTENT_WIDTH,
//           align: "justify",
//           lineGap: 3,
//         });

//       doc.moveDown();

//       doc.text(
//         "You are expected to enter into an employment agreement, which details the scope, terms, and conditions of your work, the necessary training, and confidentiality obligations with our organization.",
//         CONTENT_X,
//         doc.y,
//         { width: CONTENT_WIDTH, align: "justify", lineGap: 3 },
//       );

//       doc.moveDown();

//       doc.text(
//         "If you do not confirm your acceptance, this offer letter will be withdrawn. To confirm your acceptance, you are required to sign at the bottom of this document.",
//         CONTENT_X,
//         doc.y,
//         { width: CONTENT_WIDTH, align: "justify", lineGap: 3 },
//       );

//       doc.moveDown();

//       doc.text(
//         "Welcome to Aaklan IT Solution Pvt. Ltd. We wish you a long, rewarding, and fulfilling career and look forward to your joining us.",
//         CONTENT_X,
//         doc.y,
//         { width: CONTENT_WIDTH, align: "justify", lineGap: 3 },
//       );

//       // Check if we need a new page for signatures
//       const pageHeight = 842; // A4 height in points
//       const footerHeight = 85; // Space needed for footer

//       if (doc.y > pageHeight - footerHeight) {
//         // Add new page and draw footer template
//         doc.addPage();
//         drawTemplate(doc);
//         doc.y = 110; // Reset position after header
//       }

//       // ===== SIGNATURE =====
//       doc.moveDown(3);

//       const y = doc.y;

//       // Bold signatures
//       doc.font("Noto-Bold").text("Yours Sincerely", CONTENT_X, y);

//       doc.font("Noto").text("Hr Manager", CONTENT_X, y + 20);

//       doc
//         .font("Noto")
//         .text("Aaklan IT Solutions Pvt. Ltd. Jaipur", CONTENT_X, y + 40);

//       // Right side signatures
//       doc
//         .font("Noto-Bold")
//         .text("Date:", CONTENT_X + CONTENT_WIDTH - 200, y + 20);

//       doc
//         .font("Noto-Bold")
//         .text("Signature:", CONTENT_X + CONTENT_WIDTH - 200, y + 40);

//       doc.end();

//       resolve(filePath);
//     } catch (err) {
//       console.error("Error generating PDF:", err);
//       reject(err);
//     }
//   });
// };


// export const generateInvoice = async () => {
//   try {
//     // Dummy test data
//     const dummyApplicant = {
//       name: "Ujjwal Kumar",
//       appliedPosition: "Full Stack Developer",
//       dateOfJoining: new Date("2025-11-20"),
//     };

//     const dummyOfferData = {
//       role: "Full Stack Developer",
//       netSalary: 14000,
//       probationPeriod: "6 months",
//       dateOfJoining: new Date("2025-11-20"),
//     };

//     // Generate PDF with dummy data
//     const pdfPath = await generateOfferLetterPDF(
//       dummyApplicant,
//       dummyOfferData,
//     );

//     return pdfPath;
//   } catch (error) {
//     console.error("Test failed:", error);
//     throw error;
//   }
// };
