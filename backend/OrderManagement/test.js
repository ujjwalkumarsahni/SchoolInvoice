import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'School name is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true  
  },
  contactPersonName: {
    type: String,
    required: [true, 'Contact person name is required'],
    trim: true
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: 'Mobile number must be 10 digits'
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  trainersRequired: {
    type: Number,
    required: [true, 'Number of trainers required is needed'],
    min: [1, 'At least 1 trainer is required'],
    default: 1
  },
  currentTrainers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  logo: {
    url: String,
    public_id: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Virtual for current trainers count
schoolSchema.virtual('trainersCount').get(function() {
  return this.currentTrainers.length;
});

// Virtual for trainer status
schoolSchema.virtual('trainerStatus').get(function() {
  const count = this.currentTrainers.length;
  const required = this.trainersRequired;
  
  if (count >= required) return 'adequate';
  if (count > 0 && count < required) return 'shortage';
  return 'critical';
});

// Indexes
schoolSchema.index({ city: 1 });
schoolSchema.index({ status: 1 });
schoolSchema.index({ 'currentTrainers': 1 });

const School = mongoose.model('School', schoolSchema);
export default School;

import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
}, { _id: false });

const bankDetailsSchema = new mongoose.Schema({
    accountHolderName: String,
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    branch: String
}, { _id: false });

const emergencyContactSchema = new mongoose.Schema({
    name: String,
    number: String,
    relation: String,
    address: String
}, { _id: false });

const trainingSchema = new mongoose.Schema({
    name: String,
    type: {
        type: String,
        enum: ['Internal', 'External', 'Workshop', 'Seminar']
    },
    date: Date,
    certificate: String,
    duration: String,
    completed: Boolean,
    organizer: String
}, { _id: false });

const finalSettlementSchema = new mongoose.Schema({
    amount: Number,
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Completed', 'Rejected'],
        default: 'Pending'
    },
    paidDate: Date,
    details: String,
    transactionId: String
}, { _id: false });

// Documents Schema with Cloudinary Public IDs
const documentsSchema = new mongoose.Schema({
    // Required Documents
    offerLetter: { type: String, default: null },
    offerLetterPublicId: { type: String, default: null },
    
    appointmentLetter: { type: String, default: null },
    appointmentLetterPublicId: { type: String, default: null }, // FIXED: Added 'type'
    
    resume: { type: String, default: null },
    resumePublicId: { type: String, default: null },
    
    passportPhoto: { type: String, default: null },
    passportPhotoPublicId: { type: String, default: null },
    
    panCard: { type: String, default: null },
    panCardPublicId: { type: String, default: null },
    
    aadhaarCard: { type: String, default: null },
    aadhaarCardPublicId: { type: String, default: null },
    
    addressProof: { type: String, default: null },
    addressProofPublicId: { type: String, default: null },

    // Arrays for multiple documents
    educationalCertificates: [{
        certificateName: String,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    idProofs: [{
        documentType: String,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    joiningDocuments: [{
        documentName: String,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    experienceLetters: [{
        companyName: String,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    relievingLetters: [{
        companyName: String,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    salarySlips: [{
        month: String,
        year: Number,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    incrementLetters: [{
        effectiveDate: Date,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    performanceReports: [{
        year: Number,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    appraisalLetters: [{
        year: Number,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    ndaAgreement: { type: String, default: null },
    ndaAgreementPublicId: { type: String, default: null },
    
    bondAgreement: { type: String, default: null },
    bondAgreementPublicId: { type: String, default: null },

    otherDocuments: [{
        documentName: String,
        fileUrl: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
    }]
}, { _id: false });

const employeeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    basicInfo: {
        fullName: { type: String, required: true, trim: true },
        employeeId: { type: String, required: true, unique: true, trim: true },
        designation: { type: String, required: true, trim: true },
        department: { type: String, required: true, trim: true },
        reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        dateOfJoining: { type: Date, required: true },
        employmentType: {
            type: String,
            enum: ['Full-Time', 'Part-Time', 'Intern', 'Contract'],
            required: true
        },
        workMode: {
            type: String,
            enum: ['Onsite', 'Work-from-Home', 'Hybrid'],
            required: true
        },
        workLocation: { type: String, required: true, trim: true },
        employeeStatus: {
            type: String,
            enum: ['Active', 'On-Notice', 'Resigned', 'Terminated', 'Probation'],
            default: 'Active'
        },
        salary: { type: Number, default: 0 }
    },

    personalDetails: {
        dateOfBirth: Date,
        gender: {
            type: String,
            enum: ['Male', 'Female', 'Other', 'Prefer-not-to-say']
        },
        bloodGroup: {
            type: String,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        },
        contactNumber: String,
        alternateContactNumber: String,
        personalEmail: String,
        currentAddress: addressSchema,
        permanentAddress: addressSchema,
        emergencyContact: emergencyContactSchema,
        maritalStatus: {
            type: String,
            enum: ['Single', 'Married', 'Divorced', 'Widowed']
        },
        bankDetails: bankDetailsSchema,
        panNumber: {
            type: String,
            uppercase: true,
            match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN']
        },
        aadhaarNumber: {
            type: String,
            match: [/^\d{12}$/, 'Invalid Aadhaar']
        },
    },

    // FIX: Initialize documents with empty object
    documents: {
        type: documentsSchema,
        default: () => ({})
    },

    training: [trainingSchema],

    exitDetails: {
        noticePeriodStart: Date,
        noticePeriodEnd: Date,
        resignationDate: Date,
        finalSettlement: finalSettlementSchema,
        clearanceStatus: {
            type: String,
            enum: ['Pending', 'In Progress', 'Completed', 'Rejected'],
            default: 'Pending'
        },
        relievingDate: Date,
        experienceLetter: String,
        exitReason: String,
        feedback: String,
        exitInterview: String
    },

    completionStatus: {
        basicInfo: { type: Boolean, default: true },
        personalDetails: { type: Boolean, default: false },
        documents: {
            required: { type: Boolean, default: false },
            optional: { type: Object, default: {} }
        },
        training: { type: Boolean, default: true },
        overallPercentage: { type: Number, default: 25, min: 0, max: 100 }
    },

    verification: {
        isVerified: { type: Boolean, default: false },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        verifiedAt: Date,
        comments: String,
        verificationLevel: {
            type: String,
            enum: ['Pending', 'In Progress', 'Verified', 'Rejected'],
            default: 'Pending'
        },
        rejectionReason: String
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastProfileUpdate: Date

}, {
    timestamps: true
});

// FIXED: Calculate completion percentage with better null checks
employeeSchema.methods.calculateCompletion = function () {
    let percentage = 25; // Basic info always filled by HR

    // Personal Details (37.5%)
    const personalFields = [
        this.personalDetails?.dateOfBirth,
        this.personalDetails?.contactNumber,
        this.personalDetails?.personalEmail,
        this.personalDetails?.panNumber,
        this.personalDetails?.aadhaarNumber,
        this.personalDetails?.emergencyContact?.name,
        this.personalDetails?.emergencyContact?.number,
        this.personalDetails?.currentAddress?.street,
        this.personalDetails?.currentAddress?.city,
        this.personalDetails?.currentAddress?.pincode,
        this.personalDetails?.bankDetails?.accountHolderName,
        this.personalDetails?.bankDetails?.bankName,
        this.personalDetails?.bankDetails?.accountNumber,
        this.personalDetails?.bankDetails?.ifscCode,
        this.personalDetails?.bankDetails?.branch
    ];

    // FIX: Use filter instead of every for better handling
    const filledPersonalFields = personalFields.filter(field => 
        field !== null && field !== undefined && field !== ''
    ).length;
    
    const personalCompletion = (filledPersonalFields / personalFields.length) * 37.5;
    this.completionStatus.personalDetails = filledPersonalFields === personalFields.length;
    percentage += personalCompletion;

    // Required Documents (37.5%) - Better null checks
    const docFields = [
        this.documents?.offerLetter,
        this.documents?.appointmentLetter,
        this.documents?.resume,
        this.documents?.passportPhoto,
        this.documents?.panCard,
        this.documents?.aadhaarCard,
        this.documents?.addressProof
    ];

    const filledDocFields = docFields.filter(doc => 
        doc !== null && doc !== undefined && doc !== ''
    ).length;

    // Check array documents
    const hasEducationalCerts = this.documents?.educationalCertificates?.length > 0;
    const hasIdProofs = this.documents?.idProofs?.length > 0;

    const totalDocFields = docFields.length + 2; // +2 for arrays
    const filledTotalDocFields = filledDocFields + (hasEducationalCerts ? 1 : 0) + (hasIdProofs ? 1 : 0);

    const docCompletion = (filledTotalDocFields / totalDocFields) * 37.5;
    this.completionStatus.documents.required = filledTotalDocFields === totalDocFields;
    percentage += docCompletion;

    this.completionStatus.overallPercentage = Math.round(percentage);
    return this.completionStatus.overallPercentage;
};

// FIXED: Check if ready for verification with null checks
employeeSchema.methods.isReadyForVerification = function () {
    this.calculateCompletion();
    return this.completionStatus.overallPercentage === 100 &&
        this.completionStatus.personalDetails &&
        this.completionStatus.documents.required;
};

// FIXED: Pre-save middleware with error handling
employeeSchema.pre('save', function () {
    try {
        this.calculateCompletion();
        this.lastProfileUpdate = new Date();
        // next();
    } catch (error) {
        console.error('Error in pre-save middleware:', error);
        // next();
    }
});

// Indexes
employeeSchema.index({ 'basicInfo.department': 1 });
employeeSchema.index({ 'verification.isVerified': 1 });
employeeSchema.index({ 'completionStatus.overallPercentage': 1 });

export default mongoose.model('Employee', employeeSchema);

import mongoose from "mongoose";

const employeePostingSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["continue", "resign", "terminate", "change_school"],
      default: "continue",
      required: true,
    },
    monthlyBillingSalary: {
      type: Number,
      required: true,
    },

    tdsPercent: {
      type: Number,
      default: 0,
    },

    gstPercent: {
      type: Number,
      default: 0,
    },

    salaryHistory: [ // ye to track salary changes over time
      {
        amount: Number,
        from: Date,
        to: Date,
      },
    ],
    remark: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

/* =====================================================
   🛡 LOOP PROTECTION
===================================================== */
// employeePostingSchema.pre('save', function () {
//   if (this._skipHook) return next();
//   // next();
// });


employeePostingSchema.pre("save", async function(){
  if(this.endDate && this.endDate < this.startDate){
    return next(new Error("End date cannot be before start date"));
  }
});

employeePostingSchema.pre("save", async function(){

  if(this.isModified("monthlyBillingSalary")){
    this.salaryHistory.push({
      amount:this.monthlyBillingSalary,
      from:new Date()
    });
  }
});


/* =====================================================
   POST SAVE
===================================================== */
employeePostingSchema.post("save", async function (doc) {
  if (doc._skipHook) return;
  await handleTrainerUpdate(doc);
});

/* =====================================================
   POST FINDONEANDUPDATE (🔥 VERY IMPORTANT)
===================================================== */
employeePostingSchema.post("findOneAndUpdate", async function () {
  const doc = await this.model.findOne(this.getQuery());
  if (!doc || doc._skipHook) return;
  await handleTrainerUpdate(doc);
});

/* =====================================================
   🔥 MAIN LOGIC (RESIGN FIXED)
===================================================== */
async function handleTrainerUpdate(posting) {
  const School = mongoose.model("School");
  const EmployeePosting = mongoose.model("EmployeePosting");

  const employeeId = posting.employee;
  const schoolId = posting.school;

  /* ---------------- RESIGN / TERMINATE ---------------- */
  if (posting.status === "resign" || posting.status === "terminate") {
    // ✅ School se remove
    await School.findByIdAndUpdate(schoolId, {
      $pull: { currentTrainers: employeeId },
    });

    // ✅ Posting inactive
    posting.isActive = false;
    posting.endDate = new Date();
    posting._skipHook = true;
    await posting.save({ validateBeforeSave: false });
  } else if (posting.status === "change_school") {
    /* ---------------- CHANGE SCHOOL ---------------- */
    const otherPostings = await EmployeePosting.find({
      employee: employeeId,
      isActive: true,
      _id: { $ne: posting._id },
    });

    for (const old of otherPostings) {
      await School.findByIdAndUpdate(old.school, {
        $pull: { currentTrainers: employeeId },
      });

      old.isActive = false;
      old.endDate = new Date();
      old._skipHook = true;
      await old.save({ validateBeforeSave: false });
    }

    await School.findByIdAndUpdate(schoolId, {
      $addToSet: { currentTrainers: employeeId },
    });

    posting.isActive = true;
    posting._skipHook = true;
    await posting.save({ validateBeforeSave: false });
  } else if (posting.status === "continue") {
    /* ---------------- CONTINUE ---------------- */
    const otherPostings = await EmployeePosting.find({
      employee: employeeId,
      isActive: true,
      _id: { $ne: posting._id },
    });

    for (const old of otherPostings) {
      await School.findByIdAndUpdate(old.school, {
        $pull: { currentTrainers: employeeId },
      });

      old.isActive = false;
      old.endDate = new Date();
      old._skipHook = true;
      await old.save({ validateBeforeSave: false });
    }

    await School.findByIdAndUpdate(schoolId, {
      $addToSet: { currentTrainers: employeeId },
    });

    posting.isActive = true;
    posting._skipHook = true;
    await posting.save({ validateBeforeSave: false });
  }
}

/* =====================================================
   INDEXES
===================================================== */
employeePostingSchema.index({ employee: 1, isActive: 1 });
employeePostingSchema.index({ school: 1, isActive: 1 });
employeePostingSchema.index({ status: 1 });
employeePostingSchema.index(
  { employee: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);
export default mongoose.model("EmployeePosting", employeePostingSchema);


import mongoose from "mongoose";
const invoiceSchema = new mongoose.Schema({

  invoiceNumber:{ type:String, unique:true },

  school:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"School"
  },

  month:Number,
  year:Number,

  /* ===== BILL DETAILS ===== */

  employees:[{
    employee:{ type:mongoose.Schema.Types.ObjectId, ref:"Employee" },

    billingSalary:Number,
    daysWorked:Number,
    leaveDeduction:Number,

    grossAmount:Number,
    tdsAmount:Number,
    finalAmount:Number
  }],

  subtotal:Number,
  gstAmount:Number,

  currentBillTotal:Number, // current month only

  /* ===== AR FIELDS ===== */

  previousDue:{ type:Number, default:0 },

  adjustment:{ type:Number, default:0 }, 
  // (-) discount / (+) extra charge

  grandTotal:Number,

  paidAmount:{ type:Number, default:0 },

  pendingAmount:{ type:Number, default:0 },

  paymentHistory:[
    {
      amount:Number,
      date:{ type:Date, default:Date.now },
      note:String
    }
  ],

  status:{
    type:String,
    enum:["generated","partial","paid"],
    default:"generated"
  }

},{timestamps:true});


/* AUTO INVOICE NUMBER */
invoiceSchema.pre("save", async function(){
  if(!this.invoiceNumber){
    const count = await mongoose.model("Invoice").countDocuments();
    this.invoiceNumber =
      `INV-${new Date().getFullYear()}-${count+1}`;
  }
});

/* ONE INVOICE PER MONTH */
invoiceSchema.index(
 { school:1, month:1, year:1 },
 { unique:true }
);

export default mongoose.model("Invoice", invoiceSchema);

import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({

  employee:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Employee"
  },

  school:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"School"
  },

  month:Number,
  year:Number,

  paid:{
    type:Number,
    default:0
  },

  unpaid:{
    type:Number,
    default:0
  }

});

leaveSchema.pre("save", async function(){
  if(this.paid + this.unpaid > 31){
    return next(new Error("Leaves exceed days in month"));
  }
});


leaveSchema.index(
 { employee:1, school:1, month:1, year:1 },
 { unique:true }
);

export default mongoose.model("Leave",leaveSchema);



import asyncHandler from "express-async-handler";
import School from "../models/School.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

// Create new school
export const createSchool = asyncHandler(async (req, res) => {
  const {
    name,
    city,
    address,
    contactPersonName,
    mobile,
    email,
    trainersRequired,
  } = req.body;

  // Check if school already exists
  const schoolExists = await School.findOne({ email });
  if (schoolExists) {
    res.status(400);
    throw new Error("School with this email already exists");
  }

  let logoData = null;

  // Upload logo if provided
  if (req.body.logoBase64) {
    try {
      logoData = await uploadToCloudinary(req.body.logoBase64);
    } catch (error) {
      res.status(400);
      throw new Error("Logo upload failed");
    }
  }

  const school = await School.create({
    name,
    city,
    address,
    contactPersonName,
    mobile,
    email,
    trainersRequired: trainersRequired || 1,
    logo: logoData,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  const populatedSchool = await School.findById(school._id)

  res.status(201).json({
    success: true,
    data: populatedSchool,
  });
});

// Get all schools
export const getSchools = asyncHandler(async (req, res) => {
  const { status, city, search } = req.query;

  let query = {};

  if (status) query.status = status;
  if (city) query.city = new RegExp(city, "i");
  if (search) {
    query.$or = [
      { name: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
      { contactPersonName: new RegExp(search, "i") },
    ];
  }

  const schools = await School.find(query)

  // Add virtuals to response
  const schoolsWithVirtuals = schools.map((school) => ({
    ...school.toObject(),
    trainersCount: school.currentTrainers.length,
    trainerStatus: school.trainerStatus,
    trainerRequirementStatus: {
      required: school.trainersRequired,
      current: school.currentTrainers.length,
      needed: Math.max(
        0,
        school.trainersRequired - school.currentTrainers.length,
      ),
    },
  }));

  res.json({
    success: true,
    count: schools.length,
    data: schoolsWithVirtuals,
  });
});

// Get single school
export const getSchool = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!id || id === "undefined") {
    return res.status(400).json({
      success: false,
      message: "Id not found",
    });
  }
  const school = await School.findById(req.params?.id)

  if (!school) {
    return res.status(400).json({
      success: false,
      message: "School not found",
    });
  }

  const schoolData = {
    ...school.toObject(),
    trainersCount: school.currentTrainers.length,
    trainerStatus: school.trainerStatus,
    trainerRequirementStatus: {
      required: school.trainersRequired,
      current: school.currentTrainers.length,
      needed: Math.max(
        0,
        school.trainersRequired - school.currentTrainers.length,
      ),
    },
  };

  res.json({
    success: true,
    data: schoolData,
  });
});

// Update school
export const updateSchool = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);

  if (!school) {
    return res.status(400).json({
      success: false,
      message: "School not found",
    });
  }

  const { status } = req.body;

  if (school.status === "active" && status === "inactive") {
    // Check if school has active trainers
    if (school.currentTrainers.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot deactivate school with active trainers. Reassign trainers first.",
      });
    }
  }

  let logoData = school.logo;

  // If new logo provided
  if (req.body.logoBase64) {
    // Delete old logo if exists
    if (school.logo && school.logo.public_id) {
      await deleteFromCloudinary(school.logo.public_id);
    }

    // Upload new logo
    try {
      logoData = await uploadToCloudinary(req.body.logoBase64);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Logo upload failed",
      });
    }
  }

  // Update school
  const updatedSchool = await School.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      logo: logoData,
      updatedBy: req.user._id,
    },
    { new: true, runValidators: true },
  )
    .populate("currentTrainers", "basicInfo.fullName basicInfo.employeeId")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.json({
    success: true,
    data: updatedSchool,
  });
});

// Delete school
export const deleteSchool = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);

  if (!school) {
    return res.status(400).json({
      success: false,
      message: "School not found",
    });
  }

  // Check if school has active trainers
  if (school.currentTrainers.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete school with active trainers. Reassign trainers first.",
    });
  }

  // Delete logo from cloudinary
  if (school.logo && school.logo.public_id) {
    await deleteFromCloudinary(school.logo.public_id);
  }

  await school.deleteOne();

  res.json({
    success: true,
    message: "School deleted successfully",
  });
});

// Get school dashboard stats
export const getSchoolStats = asyncHandler(async (req, res) => {
  const totalSchools = await School.countDocuments();
  const activeSchools = await School.countDocuments({ status: "active" });
  const inactiveSchools = await School.countDocuments({ status: "inactive" });

  const schools = await School.find({ status: "active" });

  let totalTrainersRequired = 0;
  let totalCurrentTrainers = 0;

  schools.forEach((school) => {
    totalTrainersRequired += school.trainersRequired;
    totalCurrentTrainers += school.currentTrainers.length;
  });

  const shortage = Math.max(0, totalTrainersRequired - totalCurrentTrainers);

  // Schools with critical shortage
  const criticalSchools = schools.filter(
    (school) => school.currentTrainers.length === 0,
  ).length;

  // Schools with adequate trainers
  const adequateSchools = schools.filter(
    (school) => school.currentTrainers.length >= school.trainersRequired,
  ).length;

  // Schools with shortage
  const shortageSchools = schools.filter(
    (school) =>
      school.currentTrainers.length > 0 &&
      school.currentTrainers.length < school.trainersRequired,
  ).length;

  res.json({
    success: true,
    data: {
      totalSchools,
      activeSchools,
      inactiveSchools,
      trainers: {
        required: totalTrainersRequired,
        current: totalCurrentTrainers,
        shortage,
        adequacy:
          totalTrainersRequired > 0
            ? Math.round((totalCurrentTrainers / totalTrainersRequired) * 100)
            : 100,
      },
      schoolsStatus: {
        critical: criticalSchools,
        shortage: shortageSchools,
        adequate: adequateSchools,
      },
    },
  });
});

// Get school's trainers
export const getSchoolTrainers = asyncHandler(async (req, res) => {

  const { id } = req.params
  if (!id || id === "undefined") {
    return res.status(400).json({
      success: false,
      message: "Id not found",
    });
  }
  const school = await School.findById(req.params?.id).populate({
    path: "currentTrainers",
    select: "basicInfo.fullName basicInfo.employeeId basicInfo.designation",
    populate: {
      path: "user",
      select: "name email",
    },
  });

  if (!school) {
    return res.status(400).json({
      success: false,
      message: "School not found",
    });
  }

  res.json({
    success: true,
    data: {
      school: {
        _id: school._id,
        name: school.name,
        trainersRequired: school.trainersRequired,
        currentCount: school.currentTrainers.length,
        needed: Math.max(
          0,
          school.trainersRequired - school.currentTrainers.length,
        ),
      },
      trainers: school.currentTrainers,
    },
  });
});


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



import { jsPDF } from "jspdf";
import EmployeePosting from "../../models/EmployeePosting.js";
import InvoiceSchoolEmployee from "../../models/SchoolInvoice/InvoiceSchoolEmployee.js";
import Leave from "../../models/SchoolInvoice/Leave.js";
import asyncHandler from "express-async-handler";

export const generateInvoice = async (req,res)=>{
  try{

    const { schoolId, month, year, adjustment=0 } = req.body;

    // 1️⃣ Prevent duplicate
    const exists = await InvoiceSchoolEmployee.findOne({school:schoolId,month,year});
    if(exists){
      return res.status(400).json({msg:"Invoice already exists"});
    }

    const monthStart = new Date(year,month-1,1);
    const monthEnd = new Date(year,month,0);

    // 2️⃣ Get active postings in that month
    const postings = await EmployeePosting.find({
      school:schoolId,
      startDate:{$lte:monthEnd},
      $or:[
        {endDate:null},
        {endDate:{$gte:monthStart}}
      ]
    }).populate("employee");

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

      const perDay = salary/30;

      const leaveDeduction = unpaid * perDay;

      const gross = salary - leaveDeduction;

      const tds = gross * (post.tdsPercent/100);

      const final = gross - tds;

      subtotal += final;

      employees.push({
        employee:post.employee._id,
        billingSalary:salary,
        daysWorked:30-unpaid,
        leaveDeduction,
        grossAmount:gross,
        tdsAmount:tds,
        finalAmount:final
      });
    }

    // 3️⃣ GST
    const gstAmount = subtotal * 0.18;

    const currentBillTotal = subtotal + gstAmount;

    // 4️⃣ Previous due
    const lastInvoice = await InvoiceSchoolEmployee
      .findOne({school:schoolId,pendingAmount:{$gt:0}})
      .sort({createdAt:-1});

    const previousDue = lastInvoice?.pendingAmount || 0;

    const grandTotal =
      currentBillTotal +
      previousDue +
      adjustment;

    const invoice = await InvoiceSchoolEmployee.create({
      school:schoolId,
      month,
      year,
      employees,
      subtotal,
      gstAmount,
      currentBillTotal,
      previousDue,
      adjustment,
      grandTotal,
      pendingAmount:grandTotal
    });

    res.json(invoice);

  }catch(err){
    res.status(500).json({error:err.message});
  }
};


export const recordPayment = async (req,res)=>{
  try{

    const { invoiceId } = req.params;
    const { amount, note } = req.body;

    const invoice = await InvoiceSchoolEmployee.findById(invoiceId);

    if(!invoice)
      return res.status(404).json({msg:"Invoice not found"});

    invoice.paidAmount += amount;

    invoice.pendingAmount =
      invoice.grandTotal - invoice.paidAmount;

    invoice.paymentHistory.push({
      amount,
      note
    });

    if(invoice.pendingAmount<=0){
      invoice.status="paid";
      invoice.pendingAmount=0;
    }else{
      invoice.status="partial";
    }

    await invoice.save();

    res.json(invoice);

  }catch(err){
    res.status(500).json({error:err.message});
  }
};


export const getSchoolOutstanding = async (req,res)=>{
  try{

    const { schoolId } = req.params;

    const invoices = await InvoiceSchoolEmployee.find({
      school:schoolId,
      pendingAmount:{$gt:0}
    });

    const totalDue =
      invoices.reduce((sum,i)=>sum+i.pendingAmount,0);

    res.json({totalDue,invoices});

  }catch(err){
    res.status(500).json({error:err.message});
  }
};



export const downloadInvoicePDF = async (req,res)=>{
  try{

    const { invoiceId } = req.params;

    const invoice = await InvoiceSchoolEmployee
      .findById(invoiceId)
      .populate("school")
      .populate("employees.employee");

    if(!invoice)
      return res.status(404).json({msg:"Invoice not found"});

    const doc = new jsPDF();

    /* HEADER */
    doc.setFontSize(18);
    doc.text("TAX INVOICE",80,20);

    doc.setFontSize(12);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`,20,40);
    doc.text(`Month: ${invoice.month}/${invoice.year}`,20,50);

    /* SCHOOL */
    doc.text(`School: ${invoice.school.name}`,20,65);
    doc.text(`City: ${invoice.school.city}`,20,75);

    /* TABLE HEADER */
    let y=95;
    doc.text("Employee",20,y);
    doc.text("Salary",70,y);
    doc.text("Deduction",110,y);
    doc.text("Final",160,y);

    y+=10;

    /* EMPLOYEE ROWS */
    invoice.employees.forEach(emp=>{
      doc.text(emp.employee.basicInfo.fullName,20,y);
      doc.text(String(emp.billingSalary),70,y);
      doc.text(String(emp.leaveDeduction),110,y);
      doc.text(String(emp.finalAmount),160,y);
      y+=10;
    });

    y+=10;

    /* TOTALS */
    doc.text(`Subtotal: ₹${invoice.subtotal}`,20,y);
    y+=10;

    doc.text(`GST: ₹${invoice.gstAmount}`,20,y);
    y+=10;

    doc.text(`Previous Due: ₹${invoice.previousDue}`,20,y);
    y+=10;

    doc.text(`Adjustment: ₹${invoice.adjustment}`,20,y);
    y+=10;

    doc.setFontSize(14);
    doc.text(`Grand Total: ₹${invoice.grandTotal}`,20,y);

    /* SEND PDF */
    const pdfBuffer = doc.output("arraybuffer");

    res.setHeader("Content-Type","application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${invoice.invoiceNumber}.pdf`
    );

    res.send(Buffer.from(pdfBuffer));

  }catch(err){
    res.status(500).json({error:err.message});
  }
};


/* =========================
   CREATE / UPDATE LEAVE
========================= */
export const upsertLeave = asyncHandler(async (req,res)=>{

  const { employee, school, month, year, paid=0, unpaid=0 } = req.body;

  if(!employee || !school || !month || !year){
    return res.status(400).json({
      success:false,
      message:"employee, school, month, year required"
    });
  }

  if(paid + unpaid > 31){
    return res.status(400).json({
      success:false,
      message:"Leaves exceed days in month"
    });
  }

  const leave = await Leave.findOneAndUpdate(
    { employee, school, month, year },
    { paid, unpaid },
    { new:true, upsert:true }
  );

  res.json({
    success:true,
    data:leave
  });

});


/* =========================
   GET LEAVES BY EMPLOYEE
========================= */
export const getEmployeeLeaves = asyncHandler(async (req,res)=>{

  const leaves = await Leave.find({
    employee:req.params.employeeId
  });

  res.json({
    success:true,
    data:leaves
  });

});

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import UserRole from '../models/UserRole.js';

export const authenticate = async (req, res, next) => {
  try {
    // Get token from cookie or header
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user with active role and permissions
    const user = await User.findById(decoded.userId)
      .select('-passwordHash');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Token invalid. User not found or inactive.' 
      });
    }

    // Get user's active role and permissions
    const userRole = await UserRole.findOne({ 
      user: user._id, 
      isActive: true 
    })
    // const userRole = await UserRole.findOne({ 
    //   user: user._id, 
    //   isActive: true 
    // }).populate('permissions');

    if (!userRole) {
      return res.status(403).json({ 
        success: false,
        message: 'No active role assigned to user.' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Add user and permissions to request
    req.user = user;
    req.userRole = userRole;
    req.userPermissions = userRole.permissions?.permissions;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Authentication failed.' 
    });
  }
};


export const requireAdminOrHR = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'hr')) {
    return res.status(403).json({
      success: false,
      message: 'Admin or HR access required'
    });
  }
  next();
};

import express from 'express';
import {
  createSchool,
  getSchools,
  getSchool,
  updateSchool,
  deleteSchool,
  getSchoolStats,
  getSchoolTrainers
} from '../controllers/schoolController.js';

import { authenticate } from '../middleware/auth.js'
import { requireAdminOrHR } from '../middleware/profileCompletion.js'

const router = express.Router();

router.route('/')
  .get(authenticate, getSchools)
  .post(authenticate, requireAdminOrHR, createSchool);

router.route('/dashboard/stats').get(authenticate, requireAdminOrHR, getSchoolStats);

router.route('/:id')
  .get(authenticate, getSchool)
  .put(authenticate, requireAdminOrHR, updateSchool)
  .delete(authenticate, requireAdminOrHR, deleteSchool);

router.route('/:id/trainers').get(authenticate, getSchoolTrainers);

export default router;

import express from 'express';
import { createEmployeePosting, getEmployeePostings } from '../controllers/EmployeePostingController.js';

import { authenticate } from '../middleware/auth.js'
import { requireAdminOrHR } from '../middleware/profileCompletion.js'

const router = express.Router();

router.route('/')
  .get(authenticate, requireAdminOrHR, getEmployeePostings)
  .post(authenticate, requireAdminOrHR, createEmployeePosting);

export default router;

import express from "express";
import { authenticate } from '../middleware/auth.js';
import { requireAdminOrHR } from '../middleware/profileCompletion.js';
import { bulkRegisterStudentsExcel, createEmployee, getAllEmployees, getAllStudents, registerStudent } from "../controllers/employeeController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

/* ================= CREATE STUDENT ================= */

router.post('/hr/create', authenticate, requireAdminOrHR, createEmployee);
router.get('/hr/employees', authenticate, requireAdminOrHR, getAllEmployees);
router.post('/students/register', authenticate, registerStudent);

router.post("/students/bulk-csv",authenticate, upload.single("file"),bulkRegisterStudentsExcel);
router.get("/students",authenticate,getAllStudents);
export default router;

import express from "express";
import { downloadInvoicePDF, generateInvoice, getSchoolOutstanding, recordPayment } from "../../controllers/SchoolInvoice/SchoolInvoiceController.js";

const router = express.Router();

/* ============================
   GENERATE INVOICE
============================ */
router.post("/generate", generateInvoice);


/* ============================
   RECORD PAYMENT
============================ */
router.post("/payment/:invoiceId", recordPayment);


/* ============================
   SCHOOL OUTSTANDING DUES
============================ */
router.get("/outstanding/:schoolId", getSchoolOutstanding);


/* ============================
   DOWNLOAD PDF
============================ */
router.get("/pdf/:invoiceId", downloadInvoicePDF);

export default router;

import express from "express";
import { getEmployeeLeaves, upsertLeave } from "../../controllers/SchoolInvoice/SchoolInvoiceController.js";


const router = express.Router();

/* CREATE / UPDATE */
router.post("/", upsertLeave);

/* GET EMPLOYEE LEAVES */
router.get("/:employeeId", getEmployeeLeaves);


export default router;

