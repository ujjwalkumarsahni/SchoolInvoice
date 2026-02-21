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

    y = Math.max(y, billToY) + 30;

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
    // ================= FIXED FOOTER SECTION =================

const FOOTER_SAFE_AREA = doc.page.height - 70; // footer se 60px upar
const bankSectionHeight = 110; // approx height of bank block

const bankX = 20;
const stampWidth = 90;

// Bottom anchored Y
const bankY = FOOTER_SAFE_AREA - bankSectionHeight;
const stampY = bankY;

// ===== Company Bank Details (Left Side) =====
doc
  .font("Helvetica-Bold")
  .fontSize(10)
  .fillColor("#1F2A44")
  .text("Company Bank Details", bankX, bankY);

let detailsY = bankY + 18;

doc.font("Helvetica").fontSize(9).fillColor("#000");

const bankRow = (label, value) => {
  doc
    .font("Helvetica")
    .text(label, bankX, detailsY, { continued: true })
    .font("Helvetica-Bold")
    .text(value);

  detailsY += 14;
};

bankRow("Account Holder: ", "Aaklan IT Solutions Pvt. Ltd.");
bankRow("Account Number: ", "50200062871746");
bankRow("IFSC: ", "HDFC0005306");
bankRow("Branch: ", "Nirman Nagar");
bankRow("Account Type: ", "Current");
bankRow("UPI: ", "9660997790@hdfcbank");

// ===== Stamp (Right Side, Footer Aligned) =====
const stampX = doc.page.width - stampWidth - 40;

try {
  doc.image("assets/stamp.png", stampX, stampY, {
    width: stampWidth,
  });
} catch {}

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
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">

  <p>Dear ${invoice.schoolDetails?.contactPersonName || "Sir/Madam"},</p>

  <p>
    ${
      isResend
        ? "Please find attached the updated invoice as requested."
        : `Please find attached the invoice for ${getMonthName(invoice.month)} ${invoice.year}.`
    }
  </p>

  ${
    isResend
      ? `
    <p style="color: #d97706;">
      <strong>Note:</strong> This invoice has been resent.
      ${reason ? `<br/>Reason: ${reason}` : ""}
    </p>
  `
      : ""
  }

  <hr/>

  <h3>Invoice Summary</h3>

  <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
  <p><strong>Invoice Period:</strong> ${getMonthName(invoice.month)} ${invoice.year}</p>
  <p><strong>School Name:</strong> ${invoice.schoolDetails?.name || "N/A"}</p>

  <br/>

  <p><strong>Subtotal:</strong> ₹${invoice.subtotal?.toLocaleString("en-IN") || "0"}</p>

  ${
    invoice.tdsAmount > 0
      ? `
    <p><strong>TDS (${invoice.tdsPercent}%):</strong> - ₹${invoice.tdsAmount?.toLocaleString("en-IN")}</p>
  `
      : ""
  }

  ${
    invoice.gstAmount > 0
      ? `
    <p><strong>GST (${invoice.gstPercent}%):</strong> + ₹${invoice.gstAmount?.toLocaleString("en-IN")}</p>
  `
      : ""
  }

  ${
    invoice.previousDue > 0
      ? `
    <p><strong>Previous Due:</strong> + ₹${invoice.previousDue?.toLocaleString("en-IN")}</p>
  `
      : ""
  }

  <p><strong>Grand Total:</strong> ₹${invoice.grandTotal?.toLocaleString("en-IN") || "0"}</p>

  <p><strong>Payment Status:</strong> ${invoice.paymentStatus || "Unpaid"}</p>

  ${
    dueAmount > 0
      ? `<p><strong>Due Amount:</strong> ₹${dueAmount.toLocaleString("en-IN")}</p>`
      : ""
  }

  <hr/>

  <h3>Employee Details</h3>

  <table border="1" cellpadding="8" cellspacing="0" width="100%">
    <tr>
      <th align="left">Employee</th>
      <th align="right">Working Days</th>
      <th align="right">Amount (₹)</th>
    </tr>
    ${invoice.items
      ?.map(
        (item) => `
      <tr>
        <td>${item.employeeName || "N/A"}</td>
        <td align="right">${item.actualWorkingDays || item.workingDays || 0}</td>
        <td align="right">${item.proratedAmount?.toLocaleString("en-IN") || "0"}</td>
      </tr>
    `,
      )
      .join("")}
  </table>

  <br/>

  <br/>

  <p>
    If you have any questions, please feel free to contact us.
  </p>

  <p>
    Regards,<br/>
    Aaklan IT Solutions Pvt. Ltd.<br/>
    support@aaklan.com
  </p>

  <hr/>
  <p style="font-size: 12px; color: #777;">
    This is an automated email. Please do not reply.
  </p>

</body>
</html>
`;

    // Email options
    const mailOptions = {
      from: `"Aaklan System" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
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

    return true;
  } catch (error) {
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

    const remainingBalance =
      (invoice.grandTotal || 0) - (invoice.paidAmount || 0);

    const mailOptions = {
      from: `"Aaklan System" <${process.env.EMAIL_FROM}>`,
      to: toEmail,
      subject: `Payment Received – ${invoice.invoiceNumber}`,

      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          
          <p>Dear ${invoice.schoolDetails?.contactPersonName || "Sir/Madam"},</p>

          <p>
            This is to confirm that we have received your payment against the invoice mentioned below.
          </p>

          <hr/>

          <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Paid Amount:</strong> ₹${Number(payment.amount).toLocaleString("en-IN")}</p>
          <p><strong>Payment Date:</strong> ${new Date(
            payment.paymentDate,
          ).toLocaleDateString("en-IN")}</p>
          <p><strong>Payment Method:</strong> ${payment.paymentMethod || "N/A"}</p>
          <p><strong>Remaining Balance:</strong> ₹${remainingBalance.toLocaleString("en-IN")}</p>

          <hr/>

          <p>
            Thank you for your prompt payment. We appreciate your continued support.
          </p>

          <p>
            If you have any questions, please feel free to contact us.
          </p>

          <br/>

          <p>
            Regards,<br/>
            Aaklan System<br/>
            support@aaklan.com
          </p>

          <hr/>
          <p style="font-size: 12px; color: #777;">
            This is an automated email. Please do not reply.
          </p>

        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error("Receipt email error:", err);
    return false;
  }
};
