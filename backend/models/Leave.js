import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  posting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeePosting',
    required: true
  },
  
  leaveType: {
    type: String,
    enum: ['paid', 'unpaid', 'sick', 'casual', 'emergency'],
    required: true
  },
  
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  
  numberOfDays: {
    type: Number,
    required: true,
    min: 0.5
  },
  
  reason: String,
  approvedBy: String,
  approvedDate: Date,
  
  // For billing deduction (only unpaid leaves affect billing)
  isDeductible: {
    type: Boolean,
    default: function() {
      return this.leaveType === 'unpaid';
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  
  // Documents
  documentUrl: String,
  documentPublicId: String,
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
leaveSchema.index({ employee: 1, startDate: -1 });
leaveSchema.index({ school: 1, startDate: -1 });
leaveSchema.index({ posting: 1 });
leaveSchema.index({ isDeductible: 1 });

// Pre-save validation
leaveSchema.pre('save', function(next) {
  if (this.startDate > this.endDate) {
    next(new Error('Start date cannot be after end date'));
  }
  
  // Calculate number of days
  const diffTime = Math.abs(this.endDate - this.startDate);
  this.numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  next();
});

const Leave = mongoose.model('Leave', leaveSchema);
export default Leave;