import Employee from "../models/Employee.js";
import User from "../models/User.js";
import UserActivity from "../models/UserActivity.js";
import UserRole from "../models/UserRole.js";


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

// Get single employee
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id)
      .populate("user", "name email role")
      .populate({
        path: "basicInfo.reportingManager",
        select: "name email"
      });

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
    console.error("Get employee error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
