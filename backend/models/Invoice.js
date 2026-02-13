import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  designation: String,
  monthlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  deployedDays: {
    type: Number,
    required: true,
    min: 0,
    max: 31
  },
  unpaidLeaves: {
    type: Number,
    default: 0,
    min: 0
  },
  billableDays: {
    type: Number,
    required: true,
    min: 0
  },
  perDayRate: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  posting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeePosting',
    required: true
  },
  joinDate: Date,
  leaveDate: Date
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  schoolName: {
    type: String,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  
  // Billing Summary
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  // Carry Forward from previous months
  previousDue: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPayable: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Payment Tracking
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  balanceDue: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['draft', 'verified', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  
  // Dates
  invoiceDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  sentDate: Date,
  paidDate: Date,
  
  // Verification
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  
  // Notes
  notes: String,
  terms: {
    type: String,
    default: 'Payment due within 30 days'
  },
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Lock sent invoices from editing
  isLocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate invoices
invoiceSchema.index({ school: 1, month: 1, year: 1 }, { unique: true });

// Indexes for performance
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ school: 1, status: 1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ 'items.employee': 1 });

// Pre-save middleware to generate invoice number if not provided
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = await mongoose.model('Invoice').countDocuments() + 1;
    this.invoiceNumber = `INV-${year}${month}-${count.toString().padStart(6, '0')}`;
  }
  
  // Lock sent invoices
  if (this.isModified('status') && this.status === 'sent') {
    this.isLocked = true;
  }
  
  next();
});

// Method to check if invoice can be edited
invoiceSchema.methods.canEdit = function() {
  return !this.isLocked && ['draft', 'verified'].includes(this.status);
};

// Method to update payment status
invoiceSchema.methods.updatePaymentStatus = function(paidAmount) {
  this.paidAmount = paidAmount;
  this.balanceDue = this.totalPayable - paidAmount;
  
  if (this.balanceDue <= 0) {
    this.status = 'paid';
    this.paidDate = new Date();
  }
  
  return this;
};

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;