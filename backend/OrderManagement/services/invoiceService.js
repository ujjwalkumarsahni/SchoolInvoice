// import Invoice from "../models/Invoice.js";
// import EmployeePosting from "../models/EmployeePosting.js";
// import Leave from "../models/Leave.js";

import EmployeePosting from "../models/EmployeePosting.js";
import InvoiceSchoolEmployee from "../models/SchoolInvoice/InvoiceSchoolEmployee.js";
import Leave from "../models/SchoolInvoice/Leave.js";

export const generateInvoiceLogic = async({
  schoolId,
  month,
  year,
  adjustment=0
})=>{

  const exists = await InvoiceSchoolEmployee.findOne({
    school:schoolId,month,year
  });

  if(exists) return;

  const postings = await EmployeePosting
    .find({school:schoolId,isActive:true})
    .populate("employee");

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
    const deduction = (salary/30)*unpaid;

    const gross = salary-deduction;
    const tds = gross*(post.tdsPercent/100);
    const final = gross-tds;

    subtotal+=final;

    employees.push({
      employee:post.employee._id,
      billingSalary:salary,
      daysWorked:30-unpaid,
      leaveDeduction:deduction,
      grossAmount:gross,
      tdsAmount:tds,
      finalAmount:final
    });
  }

  const gst = subtotal*0.18;
  const currentTotal=subtotal+gst;

  const lastInvoice = await Invoice
    .findOne({school:schoolId})
    .sort({createdAt:-1});

  const prevDue = lastInvoice?.pendingAmount || 0;

  const grandTotal=currentTotal+prevDue+adjustment;

  await InvoiceSchoolEmployee.create({
    school:schoolId,
    month,
    year,
    employees,
    subtotal,
    gstAmount:gst,
    currentBillTotal:currentTotal,
    previousDue:prevDue,
    adjustment,
    grandTotal,
    pendingAmount:grandTotal
  });
};
