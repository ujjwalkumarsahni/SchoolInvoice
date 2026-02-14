// Model
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['teacher', 'student', 'admin', 'hr', 'employee'],
    default: 'teacher'
  },
  organization: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  profile: {
    avatar: String || null,
    bio: String,
    subjects: [String],
    grades: [String]
  }
}, {
  timestamps: true
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});


// Virtual for user activities
userSchema.virtual('activities', {
  ref: 'UserActivity',
  localField: '_id',
  foreignField: 'user'
});

// Virtual for user roles
userSchema.virtual('roles', {
  ref: 'UserRole',
  localField: '_id',
  foreignField: 'user'
});

export default mongoose.model('User', userSchema);

import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
  },
  resourceType: {
    type: String,
    enum: ['lesson', 'quiz', 'project', 'unit_plan', 'user', 'permission', 'system', 'template']
  },
  resourceId: mongoose.Schema.Types.ObjectId,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for analytics
userActivitySchema.index({ user: 1, timestamp: -1 });
userActivitySchema.index({ action: 1, timestamp: -1 });
userActivitySchema.index({ resourceType: 1, timestamp: -1 });

export default mongoose.model('UserActivity', userActivitySchema);

import mongoose from 'mongoose';

const userRoleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['teacher', 'student', 'admin', 'hr', 'employee'],
    required: true
  },
  // permissions: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Permission',
  //   required: true
  // },
  customPermissions: {
    // Override default permissions for specific user
    templates: {
      access: [String],
      restrictions: [String]
    },
    features: {
      enabled: [String],
      disabled: [String]
    },
    limits: {
      dailyAiGenerations: Number,
      maxContentItems: Number,
      maxStorageMB: Number
    }
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  expiresAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
userRoleSchema.index({ user: 1, isActive: 1 });
userRoleSchema.index({ role: 1, isActive: 1 });

export default mongoose.model('UserRole', userRoleSchema);

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


import mongoose from 'mongoose';

const employeePostingSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  // ⭐ IMPORTANT: Ye rate company school se charge karegi
  monthlyBillingSalary: {
    type: Number,
    required: [true, 'Billing rate is required'],
    min: [0, 'Billing rate cannot be negative'],
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: 'Billing rate must be greater than 0'
    }
  },
  startDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['continue', 'resign', 'terminate', 'change_school'],
    default: 'continue',
    required: true
  },
  remark: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ Virtual for total billing
employeePostingSchema.virtual('totalBilling').get(function() {
  if (!this.endDate) return null;
  const days = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  const months = days / 30;
  return this.billingRate * months;
});

// ✅ Pre-save validation
employeePostingSchema.pre('save', function(next) {
  if (this.isActive && !this.monthlyBillingSalary) {
    next(new Error('Billing rate is required for active postings'));
  }
  if (this.isActive && this.monthlyBillingSalary <= 0) {
    next(new Error('Billing rate must be greater than 0'));
  }
  next();
});

/* =====================================================
   🛡 LOOP PROTECTION
===================================================== */
employeePostingSchema.pre('save', function (next) {
  if (this._skipHook) return next();
  next();
});

/* =====================================================
   POST SAVE
===================================================== */
employeePostingSchema.post('save', async function (doc) {
  if (doc._skipHook) return;
  await handleTrainerUpdate(doc);
});

/* =====================================================
   POST FINDONEANDUPDATE
===================================================== */
employeePostingSchema.post('findOneAndUpdate', async function () {
  const doc = await this.model.findOne(this.getQuery());
  if (!doc || doc._skipHook) return;
  await handleTrainerUpdate(doc);
});

/* =====================================================
   🔥 MAIN LOGIC WITH BILLING RATE VALIDATION
===================================================== */
async function handleTrainerUpdate(posting) {
  const School = mongoose.model('School');
  const EmployeePosting = mongoose.model('EmployeePosting');

  const employeeId = posting.employee;
  const schoolId = posting.school;

  /* ---------------- RESIGN / TERMINATE ---------------- */
  if (posting.status === 'resign' || posting.status === 'terminate') {
    await School.findByIdAndUpdate(
      schoolId,
      { $pull: { currentTrainers: employeeId } }
    );

    posting.isActive = false;
    posting.endDate = new Date();
    posting._skipHook = true;
    await posting.save({ validateBeforeSave: false });
  }

  /* ---------------- CHANGE SCHOOL / CONTINUE ---------------- */
  else if (posting.status === 'change_school' || posting.status === 'continue') {
    
    //  Validate billing rate before activation
    if (!posting.billingRate || posting.billingRate <= 0) {
      console.error(`Invalid billing rate for posting ${posting._id}`);
      // Aap yahan error throw kar sakte ho ya default set kar sakte ho
      // throw new Error('Cannot activate posting without valid billing rate');
    }

    const otherPostings = await EmployeePosting.find({
      employee: employeeId,
      isActive: true,
      _id: { $ne: posting._id }
    });

    for (const old of otherPostings) {
      await School.findByIdAndUpdate(
        old.school,
        { $pull: { currentTrainers: employeeId } }
      );

      old.isActive = false;
      old.endDate = new Date();
      old._skipHook = true;
      await old.save({ validateBeforeSave: false });
    }

    await School.findByIdAndUpdate(
      schoolId,
      { $addToSet: { currentTrainers: employeeId } }
    );

    posting.isActive = true;
    posting._skipHook = true;
    await posting.save({ validateBeforeSave: false });
  }
}

/* =====================================================
   INDEXES - UPDATED
===================================================== */
employeePostingSchema.index({ employee: 1, isActive: 1 });
employeePostingSchema.index({ school: 1, isActive: 1 });
employeePostingSchema.index({ status: 1 });
employeePostingSchema.index({ billingRate: 1 }); 
employeePostingSchema.index({ school: 1, isActive: 1, billingRate: 1 }); 

export default mongoose.model('EmployeePosting', employeePostingSchema);

import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leaveType: {
    type: String,
    enum: ['Casual', 'Sick', 'Earned', 'Maternity', 'Paternity', 'Unpaid'],
    default: 'Casual'
  },
  fromDate: {
    type: Date,
    required: true
  },
  toDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },
  totalDays: {
    type: Number,
    default: 1
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String
}, {
  timestamps: true
});

leaveSchema.pre('save', function(next) {
  if (this.fromDate && this.toDate) {
    const diffTime = Math.abs(this.toDate - this.fromDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    this.totalDays = diffDays + 1;
  }
  next();
});

leaveSchema.index({ employee: 1, fromDate: 1 });
leaveSchema.index({ status: 1 });

export default mongoose.model('Leave', leaveSchema);

import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
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

holidaySchema.index({ date: 1 });

export default mongoose.model('Holiday', holidaySchema);

// Routes

import express from "express";
import { login } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);

export default router;

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

import { authenticate } from '../middleware/auth.js';
import { requireAdminOrHR } from '../middleware/profileCompletion.js';

const router = express.Router();

// Create + Get All
router.route('/')
  .get(authenticate, getSchools)
  .post(authenticate, requireAdminOrHR, createSchool);

// Dashboard Stats
router.get(
  '/dashboard/stats',
  authenticate,
  requireAdminOrHR,
  getSchoolStats
);

// Single School
router.route('/:id')
  .get(authenticate, getSchool)
  .put(authenticate, requireAdminOrHR, updateSchool)
  .delete(authenticate, requireAdminOrHR, deleteSchool);

// School Trainers
router.get(
  '/:id/trainers',
  authenticate,
  getSchoolTrainers
);

export default router;

import express from "express";
import { authenticate } from '../middleware/auth.js';
import { requireAdminOrHR } from '../middleware/profileCompletion.js';
import {createEmployee, getAllEmployees, getEmployeeById } from "../controllers/employeeController.js";

const router = express.Router();

/* ================= CREATE STUDENT ================= */

router.post('/hr/create', authenticate, requireAdminOrHR, createEmployee);
router.get('/hr/employees', authenticate, requireAdminOrHR, getAllEmployees);
router.get(
  '/hr/employees/:id',
  authenticate,
  requireAdminOrHR,
  getEmployeeById
);

export default router;


// import express from 'express';
// import { createEmployeePosting, getEmployeePostings } from '../controllers/EmployeePostingController.js';

// import { authenticate } from '../middleware/auth.js'
// import { requireAdminOrHR } from '../middleware/profileCompletion.js'

// const router = express.Router();

// router.route('/')
//   .get(authenticate, requireAdminOrHR, getEmployeePostings)
//   .post(authenticate, requireAdminOrHR, createEmployeePosting);

// export default router;



import express from "express";

import {
  createEmployeePosting,
  getEmployeePostings,
  getEmployeePosting,
  updateEmployeePosting,
  getEmployeePostingHistory,
  getEmployeeCurrentStatus,
  getPostingAnalytics,
  getAllActiveEmployees,
  getActiveEmployeebyId
} from "../controllers/EmployeePostingController.js";

import { authenticate } from "../middleware/auth.js";
import { requireAdminOrHR } from "../middleware/profileCompletion.js";

const router = express.Router();


// ==============================
// POSTING CRUD
// ==============================

// Create + Get All
router.route("/")
  .get(authenticate, requireAdminOrHR, getEmployeePostings)
  .post(authenticate, requireAdminOrHR, createEmployeePosting);

// Single Posting
router.route("/:id")
  .get(authenticate, requireAdminOrHR, getEmployeePosting)
  .put(authenticate, requireAdminOrHR, updateEmployeePosting);


// ==============================
// EMPLOYEE RELATED
// ==============================

// Employee posting history
router.get(
  "/history/:employeeId",
  authenticate,
  requireAdminOrHR,
  getEmployeePostingHistory
);

// Employee current status
router.get(
  "/current/:employeeId",
  authenticate,
  requireAdminOrHR,
  getEmployeeCurrentStatus
);


// ==============================
// ANALYTICS
// ==============================

router.get(
  "/analytics/overview",
  authenticate,
  requireAdminOrHR,
  getPostingAnalytics
);


// ==============================
// ACTIVE EMPLOYEES
// ==============================

// All active employees
router.get(
  "/employees/active",
  authenticate,
  requireAdminOrHR,
  getAllActiveEmployees
);

// Active employee by ID
router.get(
  "/employees/active/:id",
  authenticate,
  requireAdminOrHR,
  getActiveEmployeebyId
);


export default router;


// Controller
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Generate JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// LOGIN
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error("User inactive");
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    message: "Login successful",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

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
    .populate("currentTrainers", "basicInfo.fullName basicInfo.employeeId")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

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
    .populate("currentTrainers", "basicInfo.fullName basicInfo.employeeId")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 });

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
    .populate({
      path: "currentTrainers",
      select: "basicInfo.fullName basicInfo.employeeId basicInfo.designation",
      populate: {
        path: "user",
        select: "name email",
      },
    })
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

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


// Get all attendance for admin view
export const getAllAttendance = async (req, res) => {
  try {
    const { month, year, employeeId, department } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year required' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Build query
    let attendanceQuery = { date: { $gte: startDate, $lte: endDate } };
    let employeeQuery = {};

    if (employeeId) {
      attendanceQuery.employee = employeeId;
    }

    if (department) {
      employeeQuery['basicInfo.department'] = department;
    }

    employeeQuery['basicInfo.employeeStatus'] = "Active";

    // Get employees first
    const employees = await Employee.find(employeeQuery)
      .select('_id basicInfo')
      //.populate('employee', 'basicInfo.fullName basicInfo.employeeId basicInfo.designation basicInfo.department')
      .populate('user', 'name email');

    const employeeIds = employees.map(emp => emp._id);

    if (employeeIds.length > 0) {
      attendanceQuery.employee = { $in: employeeIds };
    }

    const attendances = await Attendance.find(attendanceQuery)
      .populate('employee', 'basicInfo.fullName basicInfo.employeeId basicInfo.department')
      .populate('user', 'name email')
      .sort({ date: 1, 'employee.basicInfo.employeeId': 1 });

    // Get holidays
    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate }
    });

    // Get pending requests
    const pendingRequests = await Request.find({
      type: 'AttendanceCorrection',
      status: 'Pending',
      attendanceDate: { $gte: startDate, $lte: endDate }
    }).populate('employee', 'basicInfo.fullName basicInfo.employeeId');

    // Check if salary generated for this month
    const salaries = await Salary.find({
      month: parseInt(month),
      year: parseInt(year),
      isLocked: true
    });

    const lockedEmployeeIds = salaries.map(s => s.employee.toString());

    res.json({
      success: true,
      data: {
        attendances,
        holidays,
        pendingRequests,
        lockedEmployeeIds,
        employees,
        month,
        year
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; ye attendance sare employee ka hai 

Directory structure:
└── models/
    ├── Employee.js
    ├── EmployeePosting.js
    ├── School.js
    ├── User.js
    ├── UserActivity.js
    └── UserRole.js

Directory structure:
└── routes/
    ├── authRoutes.js
    ├── EmployeePostingRoutes.js
    ├── employeeRoutes.js
    └── schoolRoutes.js

Directory structure:
└── controllers/
    ├── authController.js
    ├── employeeController.js
    ├── EmployeePostingController.js
    └── schoolController.js



Achhe se mere ye all Model ,Routes and Controller ko dekho samjho 

-- Hame School Ke liye Invoice Generate Karani hai next month ke 1 tarik ko ye pichhle month ka invoice generate kar ke dega automatic 
-- Employee ke salary ke hisab se nahi karna hai, jab ham school me employee ko posting kar raha hu us time monthlyBillingSalary de raha hu us hisab se karni hai 
-- us school me jitne bhi employee ka posting huaa hoga sare ka ek sath invoice banna chahiye and invoice number autogenerated hona chahiye 
-- pichhle month ka invoice next month ke 1 tarik ko autogenerate ho jayega fir admin ek ek kar ke verify karegi agar verify ho gya to ek verify invoice ka list hoga waha se all check box karenge fir send btn par click karenge to sare school ka invoce pdf me bheje jayenge email par 
-- jo bhi invoice generate hoga use admin puri tarah se custmaize kar sakte hai verify karte samaye 
-- Employee jitna leave kiya hai uska utna deduct ho kar school invoice generate honi chahiye fir admin verify karte samaye leave count bdha and ghata sakti hai fir verify kare kuchh bhi customize kar sakti hai verify karte samaye 


Invoice Pdf me 
School ka detail hoga and invoice number hoga fir 
employee 1 ka name and monthlyBillingSalary hoga us me se agar leave hoga employee ka to deduct ho kar show honi chahiye 
agar employee 2 hoga to uska bhi sare field honge jo emplouee 1 me liya hai 
agar gst ho to niche dikhe ,
agar tds ho to niche dikhe ,
fir final total dikhe 


