import Employee from "../models/Employee.js";
import EmployeePosting from "../models/EmployeePosting.js";
import School from "../models/School.js";
import asyncHandler from "express-async-handler";

export const createEmployeePosting = asyncHandler(async (req, res) => {
  let { 
  employee,
  school,
  startDate,
  endDate,
  status,
  remark,
  monthlyBillingSalary,
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


// Helper function for status messages
const getStatusMessage = (status) => {
  const messages = {
    continue: "Employee posted successfully",
    resign: "Employee resignation recorded",
    terminate: "Employee termination recorded",
    change_school: "Employee transferred successfully",
  };
  return messages[status] || "Posting created successfully";
};

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

// Get employee posting by ID
export const getEmployeePosting = asyncHandler(async (req, res) => {
  if (!req.params?.id || req.params?.id === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Employee posting id is required",
      });
    }
  const posting = await EmployeePosting.findById(req.params?.id)
    .populate({
      path: "employee",
      select: "basicInfo.fullName basicInfo.employeeId basicInfo.designation",
      populate: {
        path: "user",
        select: "name email role",
      },
    })
    .populate("school", "name city address contactPersonName mobile email")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!posting) {
    return res.status(400).json({
      success: false,
      message: "Employee posting not found",
    });
  }

  res.json({
    success: true,
    data: posting,
  });
});

// Update employee posting
export const updateEmployeePosting = asyncHandler(async (req, res) => {
  if (!req.params?.id || req.params?.id === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Employee posting id is required",
      });
    }
  const posting = await EmployeePosting.findById(req.params?.id);

  if (!posting) {
    return res.status(400).json({
      success: false,
      message: "Employee posting not found",
    });
  }

  // Model ke pre-hook automatically handle karega
  const { isActive, ...updateData } = req.body;

  // Status change validation
  const oldStatus = posting.status;
  const newStatus = updateData.status;

  if (oldStatus !== "continue" && newStatus === "continue" || (oldStatus !== "change_school" && newStatus === "change_school") && oldStatus !== "continue" && newStatus === "continue") {
    return res.status(400).json({
      success: false,
      message: "Cannot continue posting. Please create new posting instead.",
    });
  }

  if (newStatus) {
    // Agar pehle resign/terminate tha aur ab continue karna chahte hain
    if (
      ["resign", "terminate"].includes(oldStatus) &&
      newStatus === "continue"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot reactivate resigned/terminated posting. Create new posting instead.",
      });
    }

    // Agar school change karna hai
    if (newStatus === "change_school") {
      // Check karo ki employee currently kisi school mein posted hai
      const currentPosting = await EmployeePosting.findOne({
        employee: posting.employee,
        isActive: true,
        status: { $in: ["continue", "change_school"] },
        _id: { $ne: posting._id },
      });

      if (!currentPosting) {
        return res.status(400).json({
          success: false,
          message: "Employee is not currently posted to any school",
        });
      }
    }
  }

  // Model ke pre-hook automatically set karega
  const updatedPosting = await EmployeePosting.findByIdAndUpdate(
    req.params.id,
    {
      ...updateData,
      updatedBy: req.user._id,
    },
    {
      new: true,
      runValidators: true,
    },
  )
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

  res.json({
    success: true,
    data: updatedPosting,
    message: newStatus
      ? `Status updated to ${newStatus}`
      : "Posting updated successfully",
  });
});

// Get employee posting history
export const getEmployeePostingHistory = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return res.status(400).json({
      success: false,
      message: "Employee not found",
    });
  }

  const postings = await EmployeePosting.find({ employee: employeeId })
    .populate("school", "name city")
    .sort({ startDate: -1 });

  // Current school find karo (jo school ke currentTrainers array mein hai)
  const schools = await School.find({ currentTrainers: employeeId });
  const currentSchools = schools.map((school) => ({
    _id: school._id,
    name: school.name,
    city: school.city,
  }));

  // Active posting find karo
  const activePosting = await EmployeePosting.findOne({
    employee: employeeId,
    isActive: true,
    status: { $in: ["continue", "change_school"] },
  }).populate("school", "name city address");

  res.json({
    success: true,
    data: {
      employee: {
        _id: employee._id,
        name: employee.basicInfo.fullName,
        employeeId: employee.basicInfo.employeeId,
      },
      history: postings,
      current: activePosting,
      currentSchools: currentSchools,
    },
  });
});

// Get employee's current posting status
export const getEmployeeCurrentStatus = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  if(!employeeId || employeeId === "undefined") {
    return res.status(400).json({
      success: false,
      message: "Employee id is required",
    });
  }

  // Active posting find karo
  const activePosting = await EmployeePosting.findOne({
    employee: employeeId,
    isActive: true,
  }).populate("school", "name city address");

  // Current schools find karo
  const schools = await School.find({ currentTrainers: employeeId }).select(
    "name city trainersRequired",
  );

  res.json({
    success: true,
    data: {
      posting: activePosting,
      currentSchools: schools,
      isCurrentlyPosted: schools.length > 0,
    },
  });
});

// Get posting analytics
export const getPostingAnalytics = asyncHandler(async (req, res) => {
  const statusAnalytics = await EmployeePosting.aggregate([
    {
      $group: {
        _id: {
          status: "$status",
          isActive: "$isActive",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.status",
        total: { $sum: "$count" },
        active: {
          $sum: {
            $cond: [{ $eq: ["$_id.isActive", true] }, "$count", 0],
          },
        },
        inactive: {
          $sum: {
            $cond: [{ $eq: ["$_id.isActive", false] }, "$count", 0],
          },
        },
      },
    },
  ]);

  const statusCounts = {};
  for (const item of statusAnalytics) {
    statusCounts[item._id] = {
      total: item.total,
      active: item.active,
      inactive: item.inactive,
    };
  }

  const schoolStats = await School.aggregate([
    { $match: { status: "active" } },
    {
      $project: {
        name: 1,
        city: 1,
        trainersRequired: 1,
        currentCount: { $size: "$currentTrainers" },
      },
    },
    {
      $addFields: {
        shortage: {
          $max: [0, { $subtract: ["$trainersRequired", "$currentCount"] }],
        },
        status: {
          $cond: {
            if: { $gte: ["$currentCount", "$trainersRequired"] },
            then: "adequate",
            else: {
              $cond: {
                if: { $gt: ["$currentCount", 0] },
                then: "shortage",
                else: "critical",
              },
            },
          },
        },
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      statusCounts,
      schoolStats,
    },
  });
});

export const getAllActiveEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ "basicInfo.employeeStatus": "Active" })
      .select("basicInfo.fullName basicInfo.employeeId basicInfo.designation basicInfo.department basicInfo.employeeStatus",)
      .populate("user", "name email role");

    res.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error("Get all employees error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const getActiveEmployeebyId = async (req, res) => {
  try {
    if (!req.params?.id || req.params?.id === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Employee id is required",
      });
    }
    const employees = await Employee.find({ "basicInfo.employeeStatus": "Active", "_id": req.params?.id })
      .select("basicInfo.fullName basicInfo.employeeId basicInfo.designation basicInfo.department basicInfo.employeeStatus basicInfo.dateOfJoining",)
      .populate("user", "name email role");

    res.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error("Get all employees error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};