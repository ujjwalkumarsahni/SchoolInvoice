import Student from "../models/student.js";
import Employee from "../models/Employee.js";

/* ================= GET STUDENTS ================= */

export const getStudents = async (req,res)=>{
  try{

    // ADMIN
    if(req.user.role==="admin"){
      const students = await Student.find()
        .populate("user","name email");

      return res.json({
        success:true,
        data:students
      });
    }

    // EMPLOYEE
    if(req.user.role==="employee"){
      const emp = await Employee.findOne({user:req.user._id});

      const students = await Student.find({
        school: emp.school
      }).populate("user","name email");

      return res.json({
        success:true,
        data:students
      });
    }

    // STUDENT
    if(req.user.role==="student"){
      const student = await Student.findOne({
        user:req.user._id
      }).populate("user","name email");

      return res.json({
        success:true,
        data:[student]
      });
    }

  }catch(err){
    res.status(500).json({msg:err.message});
  }
};
