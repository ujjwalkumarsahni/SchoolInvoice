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