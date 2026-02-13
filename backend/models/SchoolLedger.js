import mongoose from 'mongoose';

const ledgerEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Entry Type
  entryType: {
    type: String,
    enum: ['invoice', 'payment', 'adjustment', 'opening_balance'],
    required: true
  },
  
  // Reference
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    enum: ['Invoice', 'Payment', null]
  },
  referenceNumber: String,
  description: String,
  
  // Amounts
  debit: {
    type: Number,
    default: 0,
    min: 0
  },
  credit: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Running Balance
  balance: {
    type: Number,
    required: true
  },
  
  // Month/Year for grouping
  month: Number,
  year: Number,
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const schoolLedgerSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    unique: true
  },
  schoolName: {
    type: String,
    required: true
  },
  
  // Current Balance
  currentBalance: {
    type: Number,
    default: 0,
    required: true
  },
  
  // All Ledger Entries
  entries: [ledgerEntrySchema],
  
  // Summary by Month
  monthlySummary: [{
    month: Number,
    year: Number,
    openingBalance: Number,
    totalInvoiced: Number,
    totalPaid: Number,
    closingBalance: Number,
    lastUpdated: Date
  }],
  
  lastEntryDate: Date,
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Method to add entry
schoolLedgerSchema.methods.addEntry = async function(entryData) {
  const lastEntry = this.entries.length > 0 
    ? this.entries[this.entries.length - 1] 
    : { balance: 0 };
  
  const newBalance = lastEntry.balance + (entryData.debit || 0) - (entryData.credit || 0);
  
  const entry = {
    ...entryData,
    balance: newBalance,
    date: entryData.date || new Date()
  };
  
  this.entries.push(entry);
  this.currentBalance = newBalance;
  this.lastEntryDate = new Date();
  
  // Update monthly summary
  await this.updateMonthlySummary(entry);
  
  return entry;
};

// Update monthly summary
schoolLedgerSchema.methods.updateMonthlySummary = async function(entry) {
  const month = entry.date.getMonth() + 1;
  const year = entry.date.getFullYear();
  
  let monthSummary = this.monthlySummary.find(
    m => m.month === month && m.year === year
  );
  
  if (!monthSummary) {
    // Get opening balance from previous month
    const prevEntries = this.entries.filter(e => {
      const eDate = new Date(e.date);
      return eDate.getFullYear() < year || 
             (eDate.getFullYear() === year && eDate.getMonth() + 1 < month);
    });
    
    const openingBalance = prevEntries.length > 0 
      ? prevEntries[prevEntries.length - 1].balance 
      : 0;
    
    monthSummary = {
      month,
      year,
      openingBalance,
      totalInvoiced: 0,
      totalPaid: 0,
      closingBalance: openingBalance,
      lastUpdated: new Date()
    };
    
    this.monthlySummary.push(monthSummary);
  }
  
  if (entry.entryType === 'invoice') {
    monthSummary.totalInvoiced += entry.debit;
    monthSummary.closingBalance += entry.debit;
  } else if (entry.entryType === 'payment') {
    monthSummary.totalPaid += entry.credit;
    monthSummary.closingBalance -= entry.credit;
  }
  
  monthSummary.lastUpdated = new Date();
};

const SchoolLedger = mongoose.model('SchoolLedger', schoolLedgerSchema);
export default SchoolLedger;