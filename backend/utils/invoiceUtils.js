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

    const sx = 350;
    doc.fillColor("#000");

    // Orange border box
    doc.rect(sx, y + 25, 200, 95).stroke("#F4A300");

    let sy = y + 35;

    const row = (label, val, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica");

      // FULL WIDTH LINE
      doc.text(`${label}`, sx + 10, sy, {
        width: 120,
        align: "left",
      });

      doc.text(money(val), sx + 10, sy, {
        width: 180,
        align: "right",
      });

      sy += 18;
    };

    row("Subtotal:", invoice.subtotal);

    if (invoice.tdsAmount > 0)
      row(`TDS (${invoice.tdsPercent}%):`, -invoice.tdsAmount);

    if (invoice.gstAmount > 0)
      row(`GST (${invoice.gstPercent}%):`, invoice.gstAmount);

    row("Grand Total:", invoice.grandTotal, true);

    if (invoice.paidAmount > 0) {
      row("Paid:", invoice.paidAmount);
      row("Balance Due:", invoice.grandTotal - invoice.paidAmount, true);
    }

    y = sy + 10;

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

    let signY = doc.page.height - 250;

    try {
      doc.image("assets/stamp.png", 60, signY + 20, { width: 90 });
    } catch {}

    doc
      .font("Helvetica-Bold")
      .text(`For ${invoice.schoolDetails.name}`, 360, signY + 90);

    doc
      .moveTo(360, signY + 115)
      .lineTo(520, signY + 115)
      .stroke();

    doc.fontSize(8).text("School Authorized Signatory", 380, signY + 120);

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

// SEND EMAIL FUNCTION
export const sendInvoiceEmail = async (toEmail, invoice, pdfBuffer) => {
  try {
    if (!toEmail) {
      console.log("No recipient email");
      return false;
    }

    const mailOptions = {
      from: `"School Management" <${process.env.EMAIL_FROM}>`,
      to: toEmail,

      subject: `Invoice ${invoice.invoiceNumber}`,

      html: `
        <h2>Invoice from Your Company</h2>
        
        <p>Dear ${invoice.schoolDetails?.contactPersonName || "Sir/Madam"},</p>
        
        <p>Please find attached invoice details:</p>
        
        <ul>
          <li><b>Invoice No:</b> ${invoice.invoiceNumber}</li>
          <li><b>Period:</b> ${invoice.month}/${invoice.year}</li>
          <li><b>Amount:</b> ₹${invoice.grandTotal}</li>
          <li><b>Status:</b> ${invoice.paymentStatus}</li>
        </ul>

        <p>Please process the payment at your convenience.</p>
        
        <p>Thank you for your business.</p>

        <br/>
        <p>Regards,<br/>Your Company</p>
      `,

      attachments: [
        {
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    return true;
  } catch (error) {
    console.error("Email send error:", error);
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
