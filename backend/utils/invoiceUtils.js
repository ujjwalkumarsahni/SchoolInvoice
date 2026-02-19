import PDFDocument from "pdfkit";
import { format } from "date-fns";
import path from "path";

// ================= HEADER + FOOTER =================
const drawHeaderFooter = (doc) => {
  const w = doc.page.width;
  const h = doc.page.height;

  const logoPath = path.join(process.cwd(), "assets/aaklan-logo.png");

  doc.save();

  // ===== HEADER =====

  doc.image(logoPath, 10, 10, { width: 120 });

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#000")
    .text("Aaklan IT Solutions Pvt. Ltd.", 400, 15, { lineBreak: false });

  doc
    .font("Helvetica")
    .fontSize(10)
    .text("IT-9(A), EPIP, IT Park Road, Sitapura", 400, 28, {
      lineBreak: false,
    })
    .text("Jaipur, Rajasthan - 302022", 400, 38, { lineBreak: false });

  // Bars
  doc.rect(0, 55, 595, 10).fill("#F4A300");
  doc.rect(520, 55, 75, 10).fill("#1F2A44");

  // ===== FOOTER =====

  doc.rect(0, h - 60, w, 12).fill("#F4A300");
  doc.rect(0, h - 48, w, 48).fill("#1F2A44");

  doc.fillColor("#fff").fontSize(8);

  const margin = 40;

  doc.text("CIN: U72900RJ2021PTC072389", margin, h - 35, {
    lineBreak: false,
  });

  doc.text("PAN: AAUCA6196N", margin, h - 35, {
    width: w - margin * 2,
    align: "right",
    lineBreak: false,
  });

  doc.text("+91 9571677609 | www.aaklan.com | support@aaklan.com", 40, h - 20, {
    width: w - 80,
    align: "center",
    lineBreak: false,
  });

  doc.restore();

  doc.x = 0;
  doc.y = 0;
};

// ================= MONEY FORMAT =================
const money = (n) => {
  return (
    "Rs " +
    new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0, // 👈 removes .00
    }).format(n || 0)
  );
};

// ================= MAIN FUNCTION =================
export const generateInvoicePDF = async (invoice) => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 0, size: "A4" });
    // Header/footer on every page
    drawHeaderFooter(doc);
    const addNewPage = (doc) => {
      doc.addPage();
      drawHeaderFooter(doc);
    };

    const TOP = 80;
    const BOTTOM = doc.page.height - 80;

    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));

    doc.on("end", () => {
      const pdf = Buffer.concat(buffers);
      resolve({
        buffer: pdf,
        base64: pdf.toString("base64"),
      });
    });

    doc.fillColor("#000");

    const startX = 20;
    let y = 95;

    // --------- BILL FROM ----------
    doc.font("Helvetica-Bold").fontSize(10).text("BILL FROM:", startX, y);

    doc.font("Helvetica");
    y += 15;

    doc
      .fontSize(9)
      .text("Aaklan IT Solutions Pvt. Ltd.", startX, y)
      .text("IT-9(A), EPIP, IT Park Road, Sitapura", startX, (y += 12))
      .text("Jaipur, Rajasthan - 302022", startX, (y += 12))
      .text("Mobile: +91 9571677609", startX, (y += 12))
      .text("Email: support@aaklan.com", startX, (y += 12));

    // --------- BILL TO ----------
    let billToY = 95;
    const billToX = 220;

    doc.font("Helvetica-Bold").fontSize(10).text("BILL TO:", billToX, billToY);

    doc.font("Helvetica");
    billToY += 15;

    doc
      .fontSize(9)
      .text(invoice.schoolDetails.name, billToX, billToY)
      .text(invoice.schoolDetails.address, billToX, (billToY += 12))
      .text(invoice.schoolDetails.city, billToX, (billToY += 12))
      .text(`Mobile: ${invoice.schoolDetails.mobile}`, billToX, (billToY += 12))
      .text(`Email: ${invoice.schoolDetails.email}`, billToX, (billToY += 12));

    // --------- INVOICE INFO (RIGHT SIDE) ----------
    let infoY = 95;
    const invoiceX = 400;

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`Invoice No: ${invoice.invoiceNumber}`, invoiceX, infoY, {
        width: 170,
        align: "right",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .text(
        `Date: ${format(new Date(invoice.generatedAt), "dd/MM/yyyy")}`,
        invoiceX,
        infoY + 15,
        { width: 170, align: "right" },
      )
      .text(`Period: ${invoice.month}/${invoice.year}`, invoiceX, infoY + 30, {
        width: 170,
        align: "right",
      });

    // ===== TABLE HEADER =====

    y = Math.max(y, billToY) + 60;

    const tableX = 20;
    const tableWidth = 555;

    doc.rect(tableX, y - 5, tableWidth, 22).fill("#1F2A44");

    doc.fillColor("#fff").font("Helvetica-Bold").fontSize(10);

    doc.text("S.No", tableX + 5, y);
    doc.text("Employee", tableX + 40, y);
    doc.text("Emp ID", tableX + 180, y);
    doc.text("Rate", tableX + 240, y, { width: 70, align: "right" });
    doc.text("Leave", tableX + 315, y, { width: 50, align: "right" }); // 👈 NEW
    doc.text("Days", tableX + 370, y, { width: 50, align: "right" });
    doc.text("Amount", tableX + 430, y, { width: 120, align: "right" });

    doc.fillColor("#000").font("Helvetica");

    y += 25;

    // ===== TABLE ROWS =====

    invoice.items.forEach((item, i) => {
      if (y > BOTTOM) {
        doc.addPage();
        y = TOP;
        drawTableHeader(y);
        y += 25;
      }

      if (i % 2 === 0) {
        doc.rect(40, y - 2, 515, 18).fill("#fafafa");
        doc.fillColor("#000");
      }

      doc.fontSize(9);
      doc.text(i + 1, tableX + 5, y);
      doc.text(item.employeeName.substring(0, 25), tableX + 40, y, {
        width: 140,
      });
      doc.text(item.employeeId, tableX + 180, y);

      doc.text(money(item.monthlyBillingSalary), tableX + 240, y, {
        width: 70,
        align: "right",
      });

      doc.text(item.leaveDays?.toString() || "0", tableX + 315, y, {
        // 👈 NEW
        width: 50,
        align: "right",
      });

      doc.text(item.actualWorkingDays.toString(), tableX + 370, y, {
        width: 50,
        align: "right",
      });

      doc.text(money(item.proratedAmount), tableX + 430, y, {
        width: 120,
        align: "right",
      });

      y += 18;
    });

    // ================= SUMMARY SECTION =================

    const sx = 340;
    let sy = y + 25; // पहले 35 था

    // ===== Calculate Payment Properly =====
    const totalPaid =
      invoice.paymentHistory?.reduce((sum, p) => sum + p.amount, 0) || 0;

    const balanceDue = invoice.grandTotal - totalPaid;

    // ===== Dynamic Box Height (Compact) =====
    let boxHeight = 115;

    if (invoice.previousDueBreakdown?.length > 0) {
      boxHeight += invoice.previousDueBreakdown.length * 18 + 10;
    }

    if (invoice.paymentHistory?.length > 0) {
      boxHeight += invoice.paymentHistory.length * 16 + 30;
    }

    // ===== Outer Box =====
    doc
      .roundedRect(sx, y + 20, 230, boxHeight, 6)
      .lineWidth(1.2)
      .stroke("#F4A300");

    // ===== Helper Row Function (Compact spacing) =====
    const row = (label, val, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica");
      doc.fontSize(9);

      doc.text(label, sx + 15, sy, { width: 130 });

      doc.text(money(val), sx + 15, sy, {
        width: 200,
        align: "right",
      });

      sy += 16; // पहले 22 था
    };

    // ===== Current Month Calculation =====
    row(`Subtotal (${invoice.month}/${invoice.year})`, invoice.subtotal);

    if (invoice.tdsAmount > 0)
      row(`TDS (${invoice.tdsPercent}%)`, -invoice.tdsAmount);

    if (invoice.gstAmount > 0)
      row(`GST (${invoice.gstPercent}%)`, invoice.gstAmount);

    const netCurrent = invoice.subtotal - invoice.tdsAmount + invoice.gstAmount;

    row("Net Current Total", netCurrent, true);

    // Divider
    doc
      .moveTo(sx + 10, sy)
      .lineTo(sx + 220, sy)
      .stroke("#ddd");
    sy += 10;

    // ===== Previous Outstanding =====
    if (invoice.previousDueBreakdown?.length > 0) {
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Previous Outstanding", sx + 15, sy);

      sy += 14;

      doc.font("Helvetica").fontSize(9);

      invoice.previousDueBreakdown.forEach((prev) => {
        const label = `${prev.month}/${prev.year} (${prev.invoiceNumber})`;

        doc.text(label, sx + 15, sy, { width: 130 });

        doc.text(money(prev.dueAmount), sx + 15, sy, {
          width: 200,
          align: "right",
        });

        sy += 15; // पहले 20 था
      });

      sy += 6;

      doc
        .moveTo(sx + 10, sy)
        .lineTo(sx + 220, sy)
        .stroke("#ddd");

      sy += 10;
    }

    // ===== Payment History =====
    if (invoice.paymentHistory?.length > 0) {
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Payments Received", sx + 15, sy);

      sy += 14;

      doc.font("Helvetica").fontSize(9);

      invoice.paymentHistory.forEach((pay) => {
        const payDate = format(new Date(pay.paymentDate), "dd/MM/yyyy");

        doc.text(payDate, sx + 15, sy, { width: 120 });

        doc.text(money(pay.amount), sx + 15, sy, {
          width: 200,
          align: "right",
        });

        sy += 14; // पहले 20 था
      });

      sy += 6;

      doc
        .moveTo(sx + 10, sy)
        .lineTo(sx + 220, sy)
        .stroke("#ddd");

      sy += 10;

      doc.font("Helvetica-Bold");

      doc.text("Total Paid", sx + 15, sy);

      doc.text(money(totalPaid), sx + 15, sy, {
        width: 200,
        align: "right",
      });

      sy += 18; // पहले 25 था
    }

    // ===== FINAL AMOUNT PAYABLE (Payment Adjusted) =====
    doc.roundedRect(sx + 5, sy - 4, 220, 26, 6).fill("#1F2A44");

    doc.fillColor("#fff");
    doc.font("Helvetica-Bold").fontSize(10);

    doc.text("Grand Total Payable", sx + 15, sy + 4);

    doc.text(money(balanceDue), sx + 15, sy + 4, {
      width: 200,
      align: "right",
    });

    doc.fillColor("#000");

    sy += 30;
    y = sy + 20; // पहले 30 था

    // Page break check before bank details
    if (y + 140 > BOTTOM) {
      addNewPage(doc);
      y = TOP + 20;
    }
    // ================= COMPANY BANK DETAILS =================

    const bankX = 20;
    let bankY = y + 10;

    // Heading
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#1F2A44")
      .text("Company Bank Details", bankX, bankY);

    bankY += 18;

    // Details
    doc.font("Helvetica").fontSize(9).fillColor("#000");

    const bankRow = (label, value) => {
      doc
        .font("Helvetica")
        .text(label, bankX, bankY, { continued: true })
        .font("Helvetica-Bold")
        .text(value);

      bankY += 14;
    };

    bankRow("Account Holder: ", "Aaklan IT Solutions Pvt. Ltd.");
    bankRow("Account Number: ", "50200062871746");
    bankRow("IFSC: ", "HDFC0005306");
    bankRow("Branch: ", "Nirman Nagar");
    bankRow("Account Type: ", "Current");
    bankRow("UPI: ", "9660997790@hdfcbank");

    const FOOTER_SAFE_AREA = doc.page.height - 40;

let signY = bankY + 20;

// अगर stamp नीचे जा रहा है तो उसे ऊपर adjust करो
if (signY + 120 > FOOTER_SAFE_AREA) {
  signY = FOOTER_SAFE_AREA - 120;
}
try {
  doc.image("assets/stamp.png", bankX, signY, { width: 80 });
} catch {}

   doc
  .font("Helvetica-Bold")
  .text(`For ${invoice.schoolDetails.name}`, 360, signY + 30);

doc
  .moveTo(360, signY + 55)
  .lineTo(520, signY + 55)
  .stroke();

doc
  .fontSize(8)
  .text("School Authorized Signatory", 380, signY + 60);


    doc.end();
  });
};

import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // smtp.gmail.com
  port: Number(process.env.EMAIL_PORT), // 465
  secure: Number(process.env.EMAIL_PORT) === 465, // true for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify SMTP connection once at startup
transporter
  .verify()
  .then(() => console.log("SMTP Server Ready"))
  .catch((err) => console.error("SMTP Config Error:", err));

// Helper to get month name
const getMonthName = (monthNumber) => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[monthNumber - 1] || monthNumber;
};

// SEND EMAIL FUNCTION (UPDATED with resend support)
export const sendInvoiceEmail = async (
  toEmail,
  invoice,
  pdfBuffer,
  options = {},
) => {
  try {
    if (!toEmail) {
      console.log("❌ No recipient email provided");
      return false;
    }

    const { isResend = false, reason = "" } = options;

    // Email subject - add [RESENT] prefix if resend
    const subject = isResend
      ? `[RESENT] Invoice ${invoice.invoiceNumber} from EduManage`
      : `Invoice ${invoice.invoiceNumber} from EduManage`;

    // Calculate due amount
    const dueAmount = invoice.grandTotal - (invoice.paidAmount || 0);

    // Email HTML content
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 500;
          }
          .header p {
            margin: 10px 0 0;
            opacity: 0.9;
            font-size: 16px;
          }
          .content {
            padding: 30px 20px;
            background-color: #f8f9fa;
          }
          .resend-banner {
            background-color: #fff3e0;
            border-left: 4px solid #ff9800;
            padding: 15px;
            margin-bottom: 25px;
            border-radius: 4px;
          }
          .resend-banner p {
            margin: 0;
            color: #e65100;
            font-weight: 500;
          }
          .invoice-details {
            background-color: white;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .invoice-details h2 {
            margin-top: 0;
            color: #1976d2;
            font-size: 20px;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 10px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: 500;
            color: #666;
          }
          .detail-value {
            font-weight: 600;
            color: #333;
          }
          .amount-highlight {
            font-size: 24px;
            color: #1976d2;
            font-weight: 700;
          }
          .due-amount {
            color: ${dueAmount > 0 ? "#d32f2f" : "#2e7d32"};
            font-weight: 700;
          }
          .payment-status {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            background-color: ${invoice.paymentStatus === "Paid" ? "#c8e6c9" : "#ffecb3"};
            color: ${invoice.paymentStatus === "Paid" ? "#2e7d32" : "#ff6f00"};
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #1976d2;
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 500;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #999;
            font-size: 14px;
            border-top: 1px solid #e0e0e0;
          }
          .company-info {
            margin-top: 20px;
            padding: 20px;
            background-color: #f1f3f4;
            border-radius: 8px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>EduManage</h1>
            <p>School Management System</p>
          </div>

          <!-- Content -->
          <div class="content">
            <!-- Resend Banner (only if resend) -->
            ${
              isResend
                ? `
              <div class="resend-banner">
                <p>⚠️ This invoice has been resent</p>
                ${reason ? `<p style="margin-top: 5px; font-size: 14px;">Reason: ${reason}</p>` : ""}
              </div>
            `
                : ""
            }

            <!-- Greeting -->
            <p style="font-size: 16px;">Dear <strong>${invoice.schoolDetails?.contactPersonName || "Sir/Madam"}</strong>,</p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              ${
                isResend
                  ? "Please find attached the updated invoice as requested."
                  : "Please find attached the invoice for the month of " +
                    getMonthName(invoice.month) +
                    " " +
                    invoice.year +
                    "."
              }
            </p>

            <!-- Invoice Details Card -->
            <div class="invoice-details">
              <h2>Invoice Summary</h2>
              
              <div class="detail-row">
                <span class="detail-label">Invoice Number:</span>
                <span class="detail-value">${invoice.invoiceNumber}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Period:</span>
                <span class="detail-value">${getMonthName(invoice.month)} ${invoice.year}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">School Name:</span>
                <span class="detail-value">${invoice.schoolDetails?.name || "N/A"}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Subtotal:</span>
                <span class="detail-value">₹${invoice.subtotal?.toLocaleString("en-IN") || "0"}</span>
              </div>
              
              ${
                invoice.tdsAmount > 0
                  ? `
                <div class="detail-row">
                  <span class="detail-label">TDS (${invoice.tdsPercent}%):</span>
                  <span class="detail-value" style="color: #d32f2f;">- ₹${invoice.tdsAmount?.toLocaleString("en-IN")}</span>
                </div>
              `
                  : ""
              }
              
              ${
                invoice.gstAmount > 0
                  ? `
                <div class="detail-row">
                  <span class="detail-label">GST (${invoice.gstPercent}%):</span>
                  <span class="detail-value" style="color: #2e7d32;">+ ₹${invoice.gstAmount?.toLocaleString("en-IN")}</span>
                </div>
              `
                  : ""
              }
              
              ${
                invoice.previousDue > 0
                  ? `
                <div class="detail-row">
                  <span class="detail-label">Previous Due:</span>
                  <span class="detail-value" style="color: #ed6c02;">+ ₹${invoice.previousDue?.toLocaleString("en-IN")}</span>
                </div>
              `
                  : ""
              }
              
              <div class="detail-row" style="border-top: 2px solid #1976d2; margin-top: 10px; padding-top: 15px;">
                <span class="detail-label" style="font-size: 18px;">Grand Total:</span>
                <span class="amount-highlight">₹${invoice.grandTotal?.toLocaleString("en-IN") || "0"}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Payment Status:</span>
                <span><span class="payment-status">${invoice.paymentStatus || "Unpaid"}</span></span>
              </div>
              
              ${
                dueAmount > 0
                  ? `
                <div class="detail-row">
                  <span class="detail-label">Due Amount:</span>
                  <span class="due-amount">₹${dueAmount.toLocaleString("en-IN")}</span>
                </div>
              `
                  : ""
              }
            </div>

            <!-- Employee Summary -->
            <div class="invoice-details">
              <h2>Employee Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f1f3f4;">
                    <th style="padding: 10px; text-align: left;">Employee</th>
                    <th style="padding: 10px; text-align: right;">Working Days</th>
                    <th style="padding: 10px; text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.items
                    ?.map(
                      (item) => `
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                      <td style="padding: 10px;">${item.employeeName || "N/A"}</td>
                      <td style="padding: 10px; text-align: right;">${item.actualWorkingDays || item.workingDays || 0}</td>
                      <td style="padding: 10px; text-align: right;">₹${item.proratedAmount?.toLocaleString("en-IN") || "0"}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>

            <!-- Company Info -->
            <div class="company-info">
              <p style="margin: 0 0 10px;"><strong>Payment Instructions:</strong></p>
              <p style="margin: 0 0 5px;">Bank: XYZ Bank</p>
              <p style="margin: 0 0 5px;">Account No: 1234567890</p>
              <p style="margin: 0 0 5px;">IFSC: XYZB123456</p>
              <p style="margin: 0; font-size: 13px;">Please mention invoice number when making payment.</p>
            </div>

            <!-- Footer Note for Resend -->
            ${
              isResend
                ? `
              <p style="color: #666; font-size: 14px; font-style: italic; margin-top: 20px;">
                Note: This is a resend of a previously sent invoice. Please discard the earlier version if you have received it.
              </p>
            `
                : ""
            }
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>This is an automated message from EduManage. Please do not reply to this email.</p>
            <p>For any queries, please contact support@edumanage.com</p>
            <p>&copy; ${new Date().getFullYear()} EduManage. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Email options
    const mailOptions = {
      from: `"EduManage" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      html: html,
      attachments: [
        {
          filename: `Invoice-${invoice.invoiceNumber}${isResend ? "-resend" : ""}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully: ${info.messageId}`);
    console.log(`   To: ${toEmail}`);
    console.log(`   Subject: ${subject}`);

    return true;
  } catch (error) {
    console.error("❌ Email send error:", error);

    // More detailed error logging
    if (error.code === "EAUTH") {
      console.error("   Authentication failed. Check email credentials.");
    } else if (error.code === "ESOCKET") {
      console.error("   Connection error. Check network/email host.");
    }

    return false;
  }
};

export const sendPaymentReceiptEmail = async (toEmail, invoice, payment) => {
  try {
    if (!toEmail) return false;

    const mailOptions = {
      from: `"School Management" <${process.env.EMAIL_FROM}>`,
      to: toEmail,

      subject: `Payment Received – ${invoice.invoiceNumber}`,

      html: `
        <h2>Payment Receipt</h2>

        <p>Dear ${invoice.schoolDetails?.contactPersonName || "Sir/Madam"},</p>

        <p>We have received your payment.</p>

        <ul>
          <li><b>Invoice No:</b> ${invoice.invoiceNumber}</li>
          <li><b>Paid Amount:</b> ₹${payment.amount}</li>
          <li><b>Payment Date:</b> ${new Date(
            payment.paymentDate,
          ).toLocaleDateString()}</li>
          <li><b>Payment Method:</b> ${payment.paymentMethod}</li>
          <li><b>Remaining Balance:</b> ₹${
            invoice.grandTotal - invoice.paidAmount
          }</li>
        </ul>

        <p>Thank you for your payment.</p>

        <p>Regards,<br/>Your Company</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error("Receipt email error:", err);
    return false;
  }
};
