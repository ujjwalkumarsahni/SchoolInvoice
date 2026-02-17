
// models/SchoolLedger.js
import mongoose from 'mongoose';

const schoolLedgerSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  transactionType: {
    type: String,
    enum: ['Invoice Generated', 'Payment Received', 'Adjustment', 'Credit Note', 'Debit Note'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balance: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  month: Number,
  year: Number,
  description: String,
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Cheque', 'Bank Transfer', 'Online', 'DD']
  },
  reference: String, // Cheque/Transaction number
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

schoolLedgerSchema.index({ school: 1, date: -1 });
schoolLedgerSchema.index({ invoice: 1 });

export default mongoose.model('SchoolLedger', schoolLedgerSchema);