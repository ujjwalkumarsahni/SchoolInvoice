import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentNumber: {
    type: String,
    required: true,
    unique: true
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'cheque', 'bank_transfer', 'online', 'dd'],
    required: true
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  bankDetails: {
    bankName: String,
    branch: String,
    chequeNumber: String,
    chequeDate: Date,
    transactionId: String
  },
  notes: String,
  status: {
    type: String,
    enum: ['pending', 'cleared', 'bounced', 'cancelled'],
    default: 'pending'
  },
  
  // For partial payments
  remainingBalance: {
    type: Number,
    default: 0
  },
  
  // Receipt
  receiptNumber: String,
  receiptGeneratedAt: Date,
  
  // Audit
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ invoice: 1 });
paymentSchema.index({ school: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ referenceNumber: 1 });

// Pre-save middleware to generate payment number
paymentSchema.pre('save', async function(next) {
  if (!this.paymentNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = await mongoose.model('Payment').countDocuments() + 1;
    this.paymentNumber = `PAY-${year}${month}-${count.toString().padStart(6, '0')}`;
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;