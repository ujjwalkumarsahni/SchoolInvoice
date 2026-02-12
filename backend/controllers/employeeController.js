import Employee from "../models/Employee.js";
import User from "../models/User.js";
import Student from "../models/student.js";
import fs from "fs";
import csv from "csv-parser";
import XLSX from "xlsx";
export const createStudent = async (req,res)=>{
  try{
    const { name,email,password } = req.body;

    const user = await User.create({
      name,
      email,
      passwordHash: password,
      role:"student"
    });

    const student = await Student.create({
      user:user._id,
      school:req.schoolId // auto from middleware
    });

    res.json({
      success:true,
      login:{
        email,
        password
      },
      student
    });

  }catch(err){
    res.status(500).json({msg:err.message});
  }
};

// export const bulkCreateStudents = async (req,res)=>{
//   try{
//     if(!req.file){
//       return res.status(400).json({msg:"CSV file required"});
//     }

//     const students=[];

//     fs.createReadStream(req.file.path)
//       .pipe(csv())
//       .on("data",(row)=>students.push(row))
//       .on("end", async ()=>{

//         let created=0;
//         let skipped=0;

//         for(const s of students){

//           // skip if email exists
//           const exists = await User.findOne({email:s.email});
//           if(exists){
//             skipped++;
//             continue;
//           }

//           const user = await User.create({
//             name:s.name,
//             email:s.email,
//             passwordHash:s.password,
//             role:"student"
//           });

//           await Student.create({
//             user:user._id,
//             school:req.schoolId
//           });

//           created++;
//         }

//         res.json({
//           success:true,
//           total:students.length,
//           created,
//           skipped
//         });

//         // delete file after processing
//         fs.unlinkSync(req.file.path);
//       });

//   }catch(err){
//     res.status(500).json({msg:err.message});
//   }
// };


// export const bulkCreateStudents = async (req,res)=>{
//   if(!req.file){
//     return res.status(400).json({msg:"CSV file required"});
//   }

//   let created=0;
//   let skipped=0;
//   let total=0;

//   const processRow = async (row)=>{
//     total++;

//     // skip empty rows
//     if(!row.email || !row.name || !row.password){
//       skipped++;
//       return;
//     }

//     const exists = await User.findOne({email:row.email});
//     if(exists){
//       skipped++;
//       return;
//     }

//     const user = await User.create({
//       name:row.name.trim(),
//       email:row.email.trim(),
//       passwordHash:row.password.trim(),
//       role:"student"
//     });

//     await Student.create({
//       user:user._id,
//       school:req.schoolId
//     });

//     created++;
//   };

//   try{
//     const stream = fs.createReadStream(req.file.path)
//       .pipe(csv());

//     for await (const row of stream){
//       await processRow(row);
//     }

//     fs.unlinkSync(req.file.path);

//     res.json({
//       success:true,
//       total,
//       created,
//       skipped
//     });

//   }catch(err){
//     fs.unlinkSync(req.file.path);
//     res.status(500).json({msg:err.message});
//   }
// };


// export const bulkCreateStudents = async (req,res)=>{
//   if(!req.file){
//     return res.status(400).json({msg:"CSV file required"});
//   }

//   let created=0;
//   let skipped=0;
//   let total=0;

//   const failedRows=[]; // ⭐ store failed

//   try{

//     const stream = fs.createReadStream(req.file.path)
//       .pipe(csv());

//     for await (const row of stream){
//       total++;

//       if(!row.email || !row.name || !row.password){
//         skipped++;
//         failedRows.push({
//           ...row,
//           reason:"Missing fields"
//         });
//         continue;
//       }

//       const exists = await User.findOne({email:row.email});

//       if(exists){
//         skipped++;
//         failedRows.push({
//           ...row,
//           reason:"Duplicate email"
//         });
//         continue;
//       }

//       const user = await User.create({
//         name:row.name.trim(),
//         email:row.email.trim(),
//         passwordHash:row.password.trim(),
//         role:"student"
//       });

//       await Student.create({
//         user:user._id,
//         school:req.schoolId
//       });

//       created++;
//     }

//     // delete CSV
//     fs.unlinkSync(req.file.path);

//     /* ===== Create Excel for failed ===== */

//     let fileUrl=null;

//     if(failedRows.length>0){

//       const wb = XLSX.utils.book_new();
//       const ws = XLSX.utils.json_to_sheet(failedRows);

//       XLSX.utils.book_append_sheet(wb,ws,"Failed");

//       const fileName=`failed_students_${Date.now()}.xlsx`;
//       const filePath=`uploads/${fileName}`;

//       XLSX.writeFile(wb,filePath);

//       fileUrl=`/${filePath}`; // download path
//     }

//     res.json({
//       success:true,
//       total,
//       created,
//       skipped,
//       failedFile:fileUrl
//     });

//   }catch(err){
//     res.status(500).json({msg:err.message});
//   }
// };


export const bulkCreateStudents = async (req,res)=>{

  if(!req.file){
    return res.status(400).json({msg:"CSV file required"});
  }

  let created=0;
  let skipped=0;
  let total=0;
  const failedRows=[];

  try{

    const stream = fs.createReadStream(req.file.path)
      .pipe(csv());

    for await (const row of stream){
      total++;

      if(!row.email || !row.name || !row.password){
        skipped++;
        failedRows.push({
          ...row,
          reason:"Missing fields"
        });
        continue;
      }

      const exists = await User.findOne({email:row.email});

      if(exists){
        skipped++;
        failedRows.push({
          ...row,
          reason:"Duplicate email"
        });
        continue;
      }

      const user = await User.create({
        name:row.name.trim(),
        email:row.email.trim(),
        passwordHash:row.password.trim(),
        role:"student"
      });

      await Student.create({
        user:user._id,
        school:req.schoolId
      });

      created++;
    }

    // delete uploaded CSV
    fs.unlinkSync(req.file.path);

    /* ===== If failures exist → send Excel ===== */

    if(failedRows.length>0){

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(failedRows);

      XLSX.utils.book_append_sheet(wb,ws,"Failed");

      const buffer = XLSX.write(wb,{
        type:"buffer",
        bookType:"xlsx"
      });

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=failed_students.xlsx"
      );

      res.type(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      return res.send(buffer);
    }

    /* ===== If no failures → normal JSON ===== */

    res.json({
      success:true,
      total,
      created,
      skipped
    });

  }catch(err){

    if(req.file && fs.existsSync(req.file.path)){
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({msg:err.message});
  }
};

/* ================= GET EMPLOYEES ================= */
export const getEmployees = async (req,res)=>{
  try{

    /* ===== ADMIN ===== */
    if(req.user.role==="admin"){
      const employees = await Employee.find()
        .populate("user","name email")
        .populate("school","name city address"); // ✅ ADD THIS

      return res.json({
        success:true,
        data:employees
      });
    }

    /* ===== EMPLOYEE ===== */
    if(req.user.role==="employee"){
      const me = await Employee.findOne({user:req.user._id});

      const employees = await Employee.find({
        school: me.school
      })
      .populate("user","name email")
      .populate("school","name city address"); // ✅ ADD THIS

      return res.json({
        success:true,
        data:employees
      });
    }

  }catch(err){
    res.status(500).json({msg:err.message});
  }
};


export const getEmployeeById = async (req,res)=>{
  try{
    const { id } = req.params;

    const employee = await Employee.findById(id)
      .populate("user","name email")
      .populate("school","name city address contactPersonName");

    if(!employee){
      return res.status(404).json({msg:"Employee not found"});
    }

    /* ===== ADMIN ===== */
    if(req.user.role==="admin"){
      return res.json({
        success:true,
        data:employee
      });
    }

    /* ===== EMPLOYEE ===== */
    if(req.user.role==="employee"){
      const me = await Employee.findOne({user:req.user._id});

      // Only same school allowed
      if(String(me.school) !== String(employee.school._id)){
        return res.status(403).json({
          msg:"Not allowed"
        });
      }

      return res.json({
        success:true,
        data:employee
      });
    }

    res.status(403).json({msg:"Not allowed"});

  }catch(err){
    res.status(500).json({msg:err.message});
  }
};
