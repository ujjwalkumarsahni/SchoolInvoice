import Employee from "../models/Employee.js";
import Student from "../models/student.js";
import User from "../models/User.js";
import UserActivity from "../models/UserActivity.js";
import EmployeePosting from "../models/EmployeePosting.js";
import UserRole from "../models/UserRole.js";
import XLSX from "xlsx";
import fs from "fs";
import csv from "csv-parser";


// HR creates employee with basic info
export const createEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      employeeId,
      designation,
      department,
      reportingManager,
      dateOfJoining,
      employmentType,
      workMode,
      workLocation,
      salary,
      organization,
      role = "employee",
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !email ||
      !password ||
      !employeeId ||
      !designation ||
      !department ||
      !reportingManager ||
      !dateOfJoining ||
      !employmentType ||
      !workMode ||
      !workLocation ||
      !salary
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    if (req.user.role !== "admin" && role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can create admin account.",
      });
    }
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Check if employee ID already exists
    const existingEmployee = await Employee.findOne({
      "basicInfo.employeeId": employeeId,
    });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: "Employee ID already exists",
      });
    }

    // Create user account
    const user = new User({
      name,
      email,
      passwordHash: password,
      role: role,
      organization: organization || "",
    });

    await user.save();

    await UserRole.create({
      user: user._id,
      role: role || "employee",
      assignedBy: req.user._id,
      isActive: true,
    });

    // Assign default permissions based on role
    // const defaultPermissions = await Permission.findOne({ role });
    // const userRole = new UserRole({
    //     user: user._id,
    //     role: role,
    //     permissions: defaultPermissions?._id || null
    // });

    // await userRole.save();

    // Create employee profile with basic info
    const employee = new Employee({
      user: user._id,
      basicInfo: {
        fullName: name,
        employeeId,
        designation,
        department,
        reportingManager,
        dateOfJoining: new Date(dateOfJoining),
        employmentType,
        workMode,
        workLocation,
        salary: salary || 0,
        employeeStatus: "Active",
      },
      createdBy: req.user._id,
      lastUpdatedBy: req.user._id,
    });

    await employee.save();

    // console.log(employee)
    // Send welcome email to employee
    // await sendWelcomeEmail(email, name, employeeId, password);

    // Log registration activity
    await UserActivity.create({
      user: user._id,
      action: "user_created",
      resourceType: "user",
      details: {
        selfRegistration: true,
        role: role,
        organization: organization || "",
      },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        employee: {
          employeeId: employee.basicInfo.employeeId,
          designation: employee.basicInfo.designation,
          department: employee.basicInfo.department,
        },
      },
    });
  } catch (error) {
    console.error("Create employee error:", error);

    // Cleanup if error occurs
    if (req.body.email) {
      await User.findOneAndDelete({ email: req.body.email });
    }

    res.status(500).json({
      success: false,
      message: "Error creating employee",
      error: error.message,
    });
  }
};

// Get all employees for HR
export const getAllEmployees = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      department = "",
      status = "",
    } = req.query;

    const query = {};

    if (search) {
      query["$or"] = [
        { "basicInfo.fullName": { $regex: search, $options: "i" } },
        { "basicInfo.employeeId": { $regex: search, $options: "i" } },
        { "basicInfo.designation": { $regex: search, $options: "i" } },
      ];
    }

    if (department) {
      query["basicInfo.department"] = department;
    }

    if (status) {
      query["basicInfo.employeeStatus"] = status;
    }

    const employees = await Employee.find(query)
      .populate("user", "name email role isActive lastLogin")
      .populate({ path: "basicInfo.reportingManager", select: "name email" })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Employee.countDocuments(query);

    res.json({
      success: true,
      data: employees,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get all employees error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get single employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await Employee.findById(id)
      .populate("user", "name email role isActive lastLogin")
      .populate({ path: "basicInfo.reportingManager", select: "name email" })
      .populate("createdBy", "name email")
      .populate("lastUpdatedBy", "name email")
      .populate("verification.verifiedBy", "name email");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error("Get employee by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Update employee
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    // Update basicInfo if provided
    if (req.body.basicInfo) {
      employee.basicInfo = {
        ...employee.basicInfo,
        ...req.body.basicInfo
      };
    }

    // Update personalDetails if provided
    if (req.body.personalDetails) {
      employee.personalDetails = {
        ...employee.personalDetails,
        ...req.body.personalDetails
      };
    }

    employee.lastUpdatedBy = req.user._id;
    employee.lastProfileUpdate = new Date();
    
    await employee.save();

    res.json({
      success: true,
      message: "Employee updated successfully",
      data: employee
    });
  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    // Check if employee has active postings
    const activePosting = await EmployeePosting.findOne({
      employee: id,
      isActive: true
    });

    if (activePosting) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete employee with active postings. Please end the posting first."
      });
    }

    // Delete user account
    await User.findByIdAndDelete(employee.user);
    
    // Delete employee
    await employee.deleteOne();

    res.json({
      success: true,
      message: "Employee deleted successfully"
    });
  } catch (error) {
    console.error("Delete employee error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


// Get potential reporting managers (Admin, HR, Senior Employees)
export const getReportingManagers = async (req, res) => {
  try {
    // Fetch users with roles: admin, hr, or employee (but active employees)
    const users = await User.find({
      role: { $in: ['admin', 'hr', 'employee'] },
      isActive: true
    }).select('_id name email role');

    // Also fetch their employee details to show employee ID and designation
    const employees = await Employee.find({
      user: { $in: users.map(u => u._id) },
      'basicInfo.employeeStatus': 'Active'
    }).populate('user', 'name email role');

    // Format the response
    const managers = employees.map(emp => ({
      _id: emp.user._id, // This is the USER ID - important!
      employeeId: emp.basicInfo?.employeeId,
      name: emp.basicInfo?.fullName || emp.user.name,
      email: emp.user.email,
      role: emp.user.role,
      designation: emp.basicInfo?.designation,
      department: emp.basicInfo?.department
    }));

    // Also include users who don't have employee profiles (pure admins)
    const usersWithoutEmployee = users.filter(user => 
      !employees.some(emp => emp.user._id.toString() === user._id.toString())
    ).map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.role === 'admin' ? 'Administrator' : 'HR Manager',
      department: 'Management'
    }));

    const allManagers = [...managers, ...usersWithoutEmployee];

    res.json({
      success: true,
      data: allManagers
    });
  } catch (error) {
    console.error('Get reporting managers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const registerStudent = async (req, res) => {
  try {
    const { name, email, password, grade } = req.body;

    // Role check
    if (req.user.role !== "employee") {
      return res.status(403).json({
        message: "Only employees can register students",
      });
    }

    if (!name || !email || !password || !grade) {
      return res.status(400).json({
        message: "All fields required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password too short",
      });
    }

    // Duplicate email check
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    // Find employee
    const employee = await Employee.findOne({ user: req.user._id });

    if (!employee) {
      return res.status(400).json({
        message: "Employee profile not found",
      });
    }

    // Active posting
    const posting = await EmployeePosting.findOne({
      employee: employee._id,
      isActive: true,
    });

    if (!posting) {
      return res.status(400).json({
        message: "Employee not assigned to any school",
      });
    }

    const schoolId = posting.school;

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash: password,
      role: "student",
    });

    // Create student
    const student = await Student.create({
      user: user._id,
      grade,
      school: schoolId,
      createdByEmployee: employee._id,
    });

    await UserRole.create({
      user: user._id,
      role: "student",
      assignedBy: req.user._id,
      isActive: true,
    });

    res.json({
      success: true,
      message: "Student registered successfully",
      student,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};  

export const bulkRegisterStudentsExcel = async (req, res) => {
  try {

    if (req.user.role !== "employee") {
      return res.status(403).json({
        message: "Only employees can register students",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Excel file required",
      });
    }

    // Find employee
    const employee = await Employee.findOne({ user: req.user._id });

    const posting = await EmployeePosting.findOne({
      employee: employee._id,
      isActive: true,
    });

    const schoolId = posting.school;

    /* ===== Read Excel ===== */

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let created = 0;
    let failed = [];

    for (const row of rows) {
      try {

        const { name, email, password, grade } = row;

        if (!name || !email || !password || !grade) {
          failed.push({ ...row, reason: "Missing fields" });
          continue;
        }

        if (password.length < 6) {
          failed.push({ ...row, reason: "Weak password" });
          continue;
        }

        const exists = await User.findOne({ email });
        if (exists) {
          failed.push({ ...row, reason: "Email exists" });
          continue;
        }

        // Create user
        const user = await User.create({
          name,
          email,
          passwordHash: password,
          role: "student",
        });

        // Student
        await Student.create({
          user: user._id,
          grade,
          school: schoolId,
          createdByEmployee: employee._id,
        });

        // Role
        await UserRole.create({
          user: user._id,
          role: "student",
          assignedBy: req.user._id,
          isActive: true,
        });

        created++;

      } catch (err) {
        failed.push({ ...row, reason: "Creation failed" });
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      total: rows.length,
      created,
      failedCount: failed.length,
      failed,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


export const getAllStudents = async (req, res) => {
  try {

    const { page = 1, limit = 10, search = "", grade } = req.query;

    // Only employee allowed
    if (req.user.role !== "employee") {
      return res.status(403).json({
        message: "Only employees can view students",
      });
    }

    // Find employee
    const employee = await Employee.findOne({ user: req.user._id });

    if (!employee) {
      return res.status(400).json({
        message: "Employee profile not found",
      });
    }

    // Active posting
    const posting = await EmployeePosting.findOne({
      employee: employee._id,
      isActive: true,
    });

    if (!posting) {
      return res.status(400).json({
        message: "Employee not assigned to any school",
      });
    }

    const schoolId = posting.school;

    /* ===== Query Build ===== */

    const query = { school: schoolId };

    if (grade) {
      query.grade = grade;
    }

    /* ===== Search by student name/email ===== */

    let userFilter = {};

    if (search) {
      userFilter = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }

    /* ===== Fetch ===== */

    const students = await Student.find(query)
      .populate({
        path: "user",
        match: userFilter,
        select: "name email",
      })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    // Remove null users (from search filter)
    const filtered = students.filter(s => s.user);

    const total = await Student.countDocuments(query);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: filtered,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};
