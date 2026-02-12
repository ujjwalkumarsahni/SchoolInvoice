import Exam from "../models/Exam.js";
import Employee from "../models/Employee.js";
import Question from "../models/Question.js";

export const createExam = async (req,res)=>{
  try{
    const {title,description,totalMarks,duration,examDate} = req.body;

    const emp = await Employee.findOne({user:req.user._id});

    if(!emp){
      return res.status(404).json({msg:"Employee not found"});
    }

    const exam = await Exam.create({
      school:emp.school,
      createdBy:emp._id,
      title,
      description,
      totalMarks,
      duration,
      examDate
    });

    res.json({
      success:true,
      data:exam
    });

  }catch(err){
    res.status(500).json({msg:err.message});
  }
};

export const addQuestion = async (req,res)=>{
  try{
    const {examId,questionText,options,correctAnswer,marks} = req.body;

    const emp = await Employee.findOne({user:req.user._id});

    const exam = await Exam.findById(examId);

    if(!exam){
      return res.status(404).json({msg:"Exam not found"});
    }

    // SECURITY CHECK
    if(String(exam.school) !== String(emp.school)){
      return res.status(403).json({
        msg:"You cannot add questions to other school exams"
      });
    }

    if(correctAnswer >= options.length){
      return res.status(400).json({
        msg:"Correct answer index invalid"
      });
    }

    const question = await Question.create({
      exam:examId,
      questionText,
      options,
      correctAnswer,
      marks
    });

    res.json({
      success:true,
      data:question
    });

  }catch(err){
    res.status(500).json({msg:err.message});
  }
};


export const getExams = async (req,res)=>{
  try{

    /* ===== ADMIN ===== */
    if(req.user.role==="admin"){
      const exams = await Exam.find()
        .populate("school","name city")
        .populate({
          path:"questions",
          select:"questionText options correctAnswer marks"
        });

      return res.json({
        success:true,
        data:exams
      });
    }

    /* ===== EMPLOYEE ===== */
    if(req.user.role==="employee"){

      const emp = await Employee.findOne({user:req.user._id});

      const exams = await Exam.find({school:emp.school})
        .populate("school","name city")
        .populate({
          path:"questions",
          select:"questionText options correctAnswer marks"
        });

      return res.json({
        success:true,
        data:exams
      });
    }

    return res.status(403).json({
      msg:"Not allowed"
    });

  }catch(err){
    res.status(500).json({msg:err.message});
  }
};
