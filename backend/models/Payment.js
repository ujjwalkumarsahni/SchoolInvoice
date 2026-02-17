

// models/Payment.js
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  invoices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  }],
  paymentNumber: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentDate: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Cheque', 'Bank Transfer', 'Online', 'DD'],
    required: true
  },
  referenceNumber: String, // Cheque/Transaction number
  bankName: String,
  branch: String,
  remarks: String,
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  receiptNumber: String,
  receiptPdf: String,
  receiptPublicId: String,
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

paymentSchema.pre('save', async function(next) {
  if (this.isNew && !this.paymentNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    const lastPayment = await this.constructor.findOne().sort({ paymentNumber: -1 });
    
    let sequence = 1;
    if (lastPayment && lastPayment.paymentNumber) {
      const lastSeq = parseInt(lastPayment.paymentNumber.split('-')[2]);
      sequence = lastSeq + 1;
    }
    
    this.paymentNumber = `PAY-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  }
  next();
});

export default mongoose.model('Payment', paymentSchema);