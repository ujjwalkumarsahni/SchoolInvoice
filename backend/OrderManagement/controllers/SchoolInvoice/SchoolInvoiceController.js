
import { jsPDF } from "jspdf";
import EmployeePosting from "../../models/EmployeePosting.js";
import InvoiceSchoolEmployee from "../../models/SchoolInvoice/InvoiceSchoolEmployee.js";
import Leave from "../../models/SchoolInvoice/Leave.js";
import asyncHandler from "express-async-handler";

export const generateInvoice = async (req,res)=>{
  try{

    const { schoolId, month, year, adjustment=0 } = req.body;

    // 1️⃣ Prevent duplicate
    const exists = await InvoiceSchoolEmployee.findOne({school:schoolId,month,year});
    if(exists){
      return res.status(400).json({msg:"Invoice already exists"});
    }

    const monthStart = new Date(year,month-1,1);
    const monthEnd = new Date(year,month,0);

    // 2️⃣ Get active postings in that month
    const postings = await EmployeePosting.find({
      school:schoolId,
      startDate:{$lte:monthEnd},
      $or:[
        {endDate:null},
        {endDate:{$gte:monthStart}}
      ]
    }).populate("employee");

    let employees=[];
    let subtotal=0;

    for(const post of postings){

      const salary = post.monthlyBillingSalary;

      const leave = await Leave.findOne({
        employee:post.employee._id,
        school:schoolId,
        month,
        year
      });

      const unpaid = leave?.unpaid || 0;

      const perDay = salary/30;

      const leaveDeduction = unpaid * perDay;

      const gross = salary - leaveDeduction;

      const tds = gross * (post.tdsPercent/100);

      const final = gross - tds;

      subtotal += final;

      employees.push({
        employee:post.employee._id,
        billingSalary:salary,
        daysWorked:30-unpaid,
        leaveDeduction,
        grossAmount:gross,
        tdsAmount:tds,
        finalAmount:final
      });
    }

    // 3️⃣ GST
    const gstAmount = subtotal * 0.18;

    const currentBillTotal = subtotal + gstAmount;

    // 4️⃣ Previous due
    const lastInvoice = await InvoiceSchoolEmployee
      .findOne({school:schoolId,pendingAmount:{$gt:0}})
      .sort({createdAt:-1});

    const previousDue = lastInvoice?.pendingAmount || 0;

    const grandTotal =
      currentBillTotal +
      previousDue +
      adjustment;

    const invoice = await InvoiceSchoolEmployee.create({
      school:schoolId,
      month,
      year,
      employees,
      subtotal,
      gstAmount,
      currentBillTotal,
      previousDue,
      adjustment,
      grandTotal,
      pendingAmount:grandTotal
    });

    res.json(invoice);

  }catch(err){
    res.status(500).json({error:err.message});
  }
};


export const recordPayment = async (req,res)=>{
  try{

    const { invoiceId } = req.params;
    const { amount, note } = req.body;

    const invoice = await InvoiceSchoolEmployee.findById(invoiceId);

    if(!invoice)
      return res.status(404).json({msg:"Invoice not found"});

    invoice.paidAmount += amount;

    invoice.pendingAmount =
      invoice.grandTotal - invoice.paidAmount;

    invoice.paymentHistory.push({
      amount,
      note
    });

    if(invoice.pendingAmount<=0){
      invoice.status="paid";
      invoice.pendingAmount=0;
    }else{
      invoice.status="partial";
    }

    await invoice.save();

    res.json(invoice);

  }catch(err){
    res.status(500).json({error:err.message});
  }
};


export const getSchoolOutstanding = async (req,res)=>{
  try{

    const { schoolId } = req.params;

    const invoices = await InvoiceSchoolEmployee.find({
      school:schoolId,
      pendingAmount:{$gt:0}
    });

    const totalDue =
      invoices.reduce((sum,i)=>sum+i.pendingAmount,0);

    res.json({totalDue,invoices});

  }catch(err){
    res.status(500).json({error:err.message});
  }
};



export const downloadInvoicePDF = async (req,res)=>{
  try{

    const { invoiceId } = req.params;

    const invoice = await InvoiceSchoolEmployee
      .findById(invoiceId)
      .populate("school")
      .populate("employees.employee");

    if(!invoice)
      return res.status(404).json({msg:"Invoice not found"});

    const doc = new jsPDF();

    /* HEADER */
    doc.setFontSize(18);
    doc.text("TAX INVOICE",80,20);

    doc.setFontSize(12);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`,20,40);
    doc.text(`Month: ${invoice.month}/${invoice.year}`,20,50);

    /* SCHOOL */
    doc.text(`School: ${invoice.school.name}`,20,65);
    doc.text(`City: ${invoice.school.city}`,20,75);

    /* TABLE HEADER */
    let y=95;
    doc.text("Employee",20,y);
    doc.text("Salary",70,y);
    doc.text("Deduction",110,y);
    doc.text("Final",160,y);

    y+=10;

    /* EMPLOYEE ROWS */
    invoice.employees.forEach(emp=>{
      doc.text(emp.employee.basicInfo.fullName,20,y);
      doc.text(String(emp.billingSalary),70,y);
      doc.text(String(emp.leaveDeduction),110,y);
      doc.text(String(emp.finalAmount),160,y);
      y+=10;
    });

    y+=10;

    /* TOTALS */
    doc.text(`Subtotal: ₹${invoice.subtotal}`,20,y);
    y+=10;

    doc.text(`GST: ₹${invoice.gstAmount}`,20,y);
    y+=10;

    doc.text(`Previous Due: ₹${invoice.previousDue}`,20,y);
    y+=10;

    doc.text(`Adjustment: ₹${invoice.adjustment}`,20,y);
    y+=10;

    doc.setFontSize(14);
    doc.text(`Grand Total: ₹${invoice.grandTotal}`,20,y);

    /* SEND PDF */
    const pdfBuffer = doc.output("arraybuffer");

    res.setHeader("Content-Type","application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${invoice.invoiceNumber}.pdf`
    );

    res.send(Buffer.from(pdfBuffer));

  }catch(err){
    res.status(500).json({error:err.message});
  }
};


/* =========================
   CREATE / UPDATE LEAVE
========================= */
export const upsertLeave = asyncHandler(async (req,res)=>{

  const { employee, school, month, year, paid=0, unpaid=0 } = req.body;

  if(!employee || !school || !month || !year){
    return res.status(400).json({
      success:false,
      message:"employee, school, month, year required"
    });
  }

  if(paid + unpaid > 31){
    return res.status(400).json({
      success:false,
      message:"Leaves exceed days in month"
    });
  }

  const leave = await Leave.findOneAndUpdate(
    { employee, school, month, year },
    { paid, unpaid },
    { new:true, upsert:true }
  );

  res.json({
    success:true,
    data:leave
  });

});


/* =========================
   GET LEAVES BY EMPLOYEE
========================= */
export const getEmployeeLeaves = asyncHandler(async (req,res)=>{

  const leaves = await Leave.find({
    employee:req.params.employeeId
  });

  res.json({
    success:true,
    data:leaves
  });

});