import mongoose from 'mongoose';

const bookCatalogSchema = new mongoose.Schema({
  bookType: {
    type: String,
    enum: ['ELP', 'LTE', 'CAC', 'CTF'],
    required: true
  },
  grade: {
    type: String,
    enum: ['Pre-Nursery', 'LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9-12']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: String,
  defaultPrice: {
    type: Number,
    required: true,
    min: 0
  },
  isCombo: {
    type: Boolean,
    default: false
  },
  comboIncludes: [{
    bookName: String,
    quantity: Number
  }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
bookCatalogSchema.index({ bookType: 1, grade: 1 });
bookCatalogSchema.index({ code: 1 });

const BookCatalog = mongoose.model('BookCatalog', bookCatalogSchema);
export default BookCatalog;