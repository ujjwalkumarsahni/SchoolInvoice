// utils/invoiceUtils.js
import PDFDocument from "pdfkit";
import { format } from "date-fns";

export const generateInvoicePDF = async (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve({
          buffer: pdfData,
          base64: pdfData.toString("base64"),
        });
      });

      // Helper functions
      const formatMoney = (amount) => {
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          minimumFractionDigits: 2,
        }).format(amount || 0);
      };

      // Company Header
      doc.fontSize(20).font("Helvetica-Bold").text("Your Company Name", 50, 50);
      doc.fontSize(10).font("Helvetica").text("123 Business Street", 50, 75);
      doc.text("City, State - 123456", 50, 90);
      doc.text("GSTIN: 22AAAAA0000A1Z5", 50, 105);
      doc.text("PAN: AAAAA0000A", 50, 120);

      // Invoice Title
      doc.fontSize(16).font("Helvetica-Bold").text("TAX INVOICE", 400, 50);

      // Invoice Details
      doc.fontSize(10).font("Helvetica");
      doc.text(`Invoice No: ${invoice.invoiceNumber}`, 400, 80);
      doc.text(
        `Date: ${format(new Date(invoice.generatedAt), "dd/MM/yyyy")}`,
        400,
        95,
      );
      doc.text(`Period: ${invoice.month}/${invoice.year}`, 400, 110);
      doc.text(`Status: ${invoice.status}`, 400, 125);

      // Line
      doc.moveTo(50, 150).lineTo(550, 150).stroke();

      // Bill To
      doc.fontSize(12).font("Helvetica-Bold").text("Bill To:", 50, 170);
      doc.fontSize(10).font("Helvetica");
      doc.text(invoice.schoolDetails.name, 50, 190);
      doc.text(invoice.schoolDetails.address, 50, 205);
      doc.text(`${invoice.schoolDetails.city}`, 50, 220);
      doc.text(`Contact: ${invoice.schoolDetails.contactPersonName}`, 50, 235);
      doc.text(`Mobile: ${invoice.schoolDetails.mobile}`, 50, 250);
      doc.text(`Email: ${invoice.schoolDetails.email}`, 50, 265);

      // Table Header
      const tableTop = 300;
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("S.No", 50, tableTop);
      doc.text("Employee Name", 90, tableTop);
      doc.text("Emp ID", 230, tableTop);
      doc.text("Monthly Rate", 300, tableTop, { width: 80, align: "right" });
      doc.text("Leave Days", 360, tableTop, { width: 60, align: "right" });
      doc.text("Working Days", 410, tableTop, { width: 60, align: "right" });
      doc.text("Amount", 480, tableTop, { width: 70, align: "right" });

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      // Table Rows
      let y = tableTop + 25;
      doc.font("Helvetica");

      invoice.items.forEach((item, index) => {
        doc.fontSize(9);
        doc.text(index + 1, 50, y);
        doc.text(item.employeeName.substring(0, 20), 90, y, { width: 130 });
        doc.text(item.employeeId, 230, y);
        doc.text(formatMoney(item.monthlyBillingSalary), 300, y, {
          width: 80,
          align: "right",
        });
        doc.text(item.leaveDays.toString(), 360, y, {
          width: 60,
          align: "right",
        });
        doc.text(item.actualWorkingDays.toString(), 410, y, {
          width: 60,
          align: "right",
        });
        doc.text(formatMoney(item.proratedAmount), 480, y, {
          width: 70,
          align: "right",
        });

        y += 20;

        // Add new page if needed
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      });

      // Line after table
      doc
        .moveTo(50, y + 10)
        .lineTo(550, y + 10)
        .stroke();

      // Summary
      const summaryY = y + 30;

      doc.font("Helvetica-Bold");
      doc.text("Subtotal:", 400, summaryY, { width: 100, align: "right" });
      doc.font("Helvetica");
      doc.text(formatMoney(invoice.subtotal), 480, summaryY, {
        width: 70,
        align: "right",
      });

      if (invoice.tdsAmount > 0) {
        doc.font("Helvetica-Bold");
        doc.text(`TDS (${invoice.tdsPercent}%):`, 400, summaryY + 20, {
          width: 100,
          align: "right",
        });
        doc.font("Helvetica");
        doc.text(`- ${formatMoney(invoice.tdsAmount)}`, 480, summaryY + 20, {
          width: 70,
          align: "right",
        });
      }

      if (invoice.gstAmount > 0) {
        doc.font("Helvetica-Bold");
        doc.text(`GST (${invoice.gstPercent}%):`, 400, summaryY + 40, {
          width: 100,
          align: "right",
        });
        doc.font("Helvetica");
        doc.text(`+ ${formatMoney(invoice.gstAmount)}`, 480, summaryY + 40, {
          width: 70,
          align: "right",
        });
      }

      // Previous Due
      if (invoice.previousDue && invoice.previousDue > 0) {
        doc.font("Helvetica-Bold");
        doc.text("Previous Due:", 400, summaryY + 60, {
          width: 100,
          align: "right",
        });

        doc.font("Helvetica");
        doc.text(formatMoney(invoice.previousDue), 480, summaryY + 60, {
          width: 70,
          align: "right",
        });
      }

      if (invoice.roundOff !== 0) {
        doc.font("Helvetica-Bold");
        doc.text("Round Off:", 400, summaryY + 60, {
          width: 100,
          align: "right",
        });
        doc.font("Helvetica");
        doc.text(formatMoney(invoice.roundOff), 480, summaryY + 60, {
          width: 70,
          align: "right",
        });
      }

      // Grand Total
      doc.font("Helvetica-Bold");
      doc.text("Grand Total:", 400, summaryY + 90, {
        width: 100,
        align: "right",
      });
      doc.text(formatMoney(invoice.grandTotal), 480, summaryY + 90, {
        width: 70,
        align: "right",
      });

      // Paid Amount
      doc.font("Helvetica");
      doc.text("Paid:", 400, summaryY + 110, { width: 100, align: "right" });
      doc.text(formatMoney(invoice.paidAmount || 0), 480, summaryY + 110, {
        width: 70,
        align: "right",
      });

      // Remaining
      const remaining = invoice.grandTotal - (invoice.paidAmount || 0);

      doc.font("Helvetica-Bold");
      doc.text("Balance Due:", 400, summaryY + 130, {
        width: 100,
        align: "right",
      });
      doc.text(formatMoney(remaining), 480, summaryY + 130, {
        width: 70,
        align: "right",
      });

      // Amount in words
      doc.fontSize(9).font("Helvetica");
      doc.text(
        `Amount in words: ${numberToWords(invoice.grandTotal)}`,
        50,
        700,
      );

      // Terms & Conditions
      doc.fontSize(8).font("Helvetica");
      doc.text("Terms & Conditions:", 50, 730);
      doc.text("1. Payment is due within 30 days", 50, 745);
      doc.text("2. Please quote invoice number for all payments", 50, 760);
      doc.text("3. This is a system generated invoice", 50, 775);

      // Footer
      doc.fontSize(8).text("Thank you for your business!", 50, 800);
      doc.text(
        `Generated on: ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
        400,
        800,
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Simple number to words converter
function numberToWords(num) {
  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if (num === 0) return "Zero";

  function convertLessThanThousand(n) {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100)
      return (
        tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "")
      );
    return (
      units[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 !== 0 ? " " + convertLessThanThousand(n % 100) : "")
    );
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  let result = "";
  if (crore > 0) result += convertLessThanThousand(crore) + " Crore ";
  if (lakh > 0) result += convertLessThanThousand(lakh) + " Lakh ";
  if (thousand > 0) result += convertLessThanThousand(thousand) + " Thousand ";
  if (remainder > 0) result += convertLessThanThousand(remainder);

  return result.trim() + " Rupees Only";
}




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

    console.log(`✅ Invoice email sent: ${invoice.invoiceNumber}`);
    console.log("Message ID:", info.messageId);

    return true;
  } catch (error) {
    console.error("❌ Email send error:", error);
    return false;
  }
};
export const sendPaymentReceiptEmail = async (
  toEmail,
  invoice,
  payment
) => {
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
            payment.paymentDate
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

    console.log("✅ Payment receipt sent");
    return true;
  } catch (err) {
    console.error("Receipt email error:", err);
    return false;
  }
};
