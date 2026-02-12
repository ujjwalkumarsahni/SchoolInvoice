import express from "express";
import { downloadInvoicePDF, generateInvoice, getSchoolOutstanding, recordPayment } from "../../controllers/SchoolInvoice/SchoolInvoiceController.js";

const router = express.Router();

/* ============================
   GENERATE INVOICE
============================ */
router.post("/generate", generateInvoice);


/* ============================
   RECORD PAYMENT
============================ */
router.post("/payment/:invoiceId", recordPayment);


/* ============================
   SCHOOL OUTSTANDING DUES
============================ */
router.get("/outstanding/:schoolId", getSchoolOutstanding);


/* ============================
   DOWNLOAD PDF
============================ */
router.get("/pdf/:invoiceId", downloadInvoicePDF);

export default router;
