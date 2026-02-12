// import User from "../models/User.js";
// import Employee from "../models/Employee.js";

// /* ================= CREATE EMPLOYEE ================= */
// export const createEmployeeByAdmin = async (req,res)=>{
//   try{
//     const {
//       name,
//       email,
//       password,
//       schoolId,
//       designation
//     } = req.body;

//     if(!schoolId){
//       return res.status(400).json({message:"School required"});
//     }

//     // Create login user
//     const user = await User.create({
//       name,
//       email,
//       passwordHash: password,
//       role:"employee"
//     });

//     // Create employee profile
//     const employee = await Employee.create({
//       user: user._id,

//       basicInfo:{
//         fullName: name,
//         employeeId: "EMP"+Date.now(),
//         designation: designation || "Trainer",
//         department: "Training",
//         dateOfJoining: new Date(),
//         employmentType: "Full-Time",
//         workMode: "Onsite",
//         workLocation: "School"
//       },

//       school: schoolId,   // ✅ MAIN LINK
//       createdBy: user._id
//     });

//     res.json({
//       success:true,
//       message:"Employee created",
//       loginCredentials:{
//         email,
//         password
//       }
//     });

//   }catch(err){
//     res.status(500).json({message:err.message});
//   }
// };



import School from "../models/School.js";
import User from "../models/User.js";
import Employee from "../models/Employee.js";

export const createSchool = async (req,res)=>{
  try{
    const {
      name,
      city,
      address,
      contactPersonName,
      mobile,
      email
    } = req.body;

    const school = await School.create({
      name,
      city,
      address,
      contactPersonName,
      mobile,
      email,
      createdBy: req.user._id, // ✅ IMPORTANT
      updatedBy: req.user._id
    });

    res.json({
      success:true,
      data:school
    });

  }catch(err){
    res.status(500).json({
      success:false,
      message:err.message
    });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const { name, email, password, schoolId } = req.body;

    // CHECK EXISTING USER
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // CREATE USER
    const user = await User.create({
      name,
      email,
      passwordHash: password, // ideally hash karo
      role: "employee"
    });

    // CREATE EMPLOYEE
    await Employee.create({
      user: user._id,
      school: schoolId
    });

    res.json({
      success: true,
      email,
      password
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

