import Employee from "../models/Employee.js";
import EmployeePosting from "../models/EmployeePosting.js";
import School from "../models/School.js";
import asyncHandler from "express-async-handler";
const getStatusMessage = (status) => {
  switch (status) {
    case "continue":
      return "Employee posting created successfully";
    case "change_school":
      return "Employee transferred to new school";
    case "resign":
      return "Employee resigned and removed from school";
    case "terminate":
      return "Employee terminated and removed from school";
    default:
      return "Posting updated";
  }
};
// Create new employee posting
export const createEmployeePosting = asyncHandler(async (req, res) => {
  let { 
  employee,
  school,
  startDate,
  endDate,
  status,
  remark,
  monthlyBillingSalary,
  tdsPercent,
  gstPercent
} = req.body;


if (!monthlyBillingSalary) {
  return res.status(400).json({
    success:false,
    message:"monthlyBillingSalary is required"
  });
}


  // Check if employee exists
  const employeeExists = await Employee.findById  (employee);
  if (!employeeExists) {
    return res.status(400).json({
      success: false,
      message: "Employee not found",
    });
  }

  // Check if school exists and is active
  const schoolExists = await School.findById(school);
  if (!schoolExists) {
    return res.status(400).json({
      success: false,
      message: "School not found",
    });
  }

  if (schoolExists.status !== "active") {
    return res.status(400).json({
      success: false,
      message: "Cannot post to inactive school",
    });
  }

  // Agar school change ka case hai
  if (status === "change_school") {
    // Check karo ki employee kisi school mein currently posted hai
    const currentPosting = await EmployeePosting.findOne({
      employee: employee,
      isActive: true,
      status: { $in: ["continue", "change_school"] },
    });

    if (!currentPosting) {
      return res.status(400).json({
        success: false,
        message: "Employee is not currently posted to any school",
      });
    }

    // Agar employee already issi school mein hai
    if (currentPosting.school.toString() === school) {
      return res.status(400).json({
        success: false,
        message: "Employee is already posted to this school",
      });
    }
  }

  // Agar continue status hai to check karo ki pehle se active posting to nahi hai
  if (status === "continue") {
    const existingActivePosting = await EmployeePosting.findOne({
      employee: employee,
      isActive: true,
      status: "continue",
    });

    if (existingActivePosting) {
      // Agar same school mein hai to error
      if (existingActivePosting.school.toString() === school) {
        return res.status(400).json({
          success: false,
          message: "Employee already has active posting in this school",
        });
      } else {
        // Different school mein hai to automatically status change_school karo
        status = "change_school";
        remark = remark || `Transferred from previous school`;
      }
    }
  }

  const posting = await EmployeePosting.create({
    employee,
    school,
    startDate: startDate || new Date(),
    endDate,
    status: status || "continue",
    remark,

    monthlyBillingSalary,
  tdsPercent: tdsPercent || 0,
  gstPercent: gstPercent || 0,
  
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  const populatedPosting = await EmployeePosting.findById(posting._id)
    .populate({
      path: "employee",
      select: "basicInfo.fullName basicInfo.employeeId basicInfo.designation",
      populate: {
        path: "user",
        select: "name email",
      },
    })
    .populate("school", "name city address")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(201).json({
    success: true,
    data: populatedPosting,
    message: getStatusMessage(status),
  });
});


//  Get all employee postings
export const getEmployeePostings = asyncHandler(async (req, res) => {
  const { employee, school, status, isActive } = req.query;

  let query = {};

  if (employee) query.employee = employee;
  if (school) query.school = school;
  if (status) query.status = status;
  if (isActive !== undefined) query.isActive = isActive === "true";
  //query.isActive = "true"

  const postings = await EmployeePosting.find(query)
    .populate({
      path: "employee",
      select: "basicInfo.fullName basicInfo.employeeId basicInfo.designation",
      populate: {
        path: "user",
        select: "name email",
      },
    })
    .populate("school", "name city address")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ startDate: -1 });

  res.json({
    success: true,
    count: postings.length,
    data: postings,
  });
});