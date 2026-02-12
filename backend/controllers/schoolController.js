import School from "../models/School.js";
import Employee from "../models/Employee.js";

/* ================= GET SCHOOLS ================= */

export const getSchools = async (req,res)=>{
  try{

    // ================= ADMIN =================
    if(req.user.role==="admin"){

      const schools = await School.find();

      // attach employees to each school
      const data = await Promise.all(
        schools.map(async (school)=>{
          const employees = await Employee.find({
            school: school._id
          }).populate("user","name email");

          return {
            ...school.toObject(),
            employees
          };
        })
      );

      return res.json({
        success:true,
        data
      });
    }

    // ================= EMPLOYEE =================
    if(req.user.role==="employee"){
      const emp = await Employee.findOne({user:req.user._id});

      const school = await School.findById(emp.school);

      const employees = await Employee.find({
        school: emp.school
      }).populate("user","name email");

      return res.json({
        success:true,
        data:[
          {
            ...school.toObject(),
            employees
          }
        ]
      });
    }

    res.status(403).json({msg:"Not allowed"});

  }catch(err){
    res.status(500).json({msg:err.message});
  }
};
