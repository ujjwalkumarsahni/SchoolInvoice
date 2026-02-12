import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  program: {
    type: String,
    required: true,
    enum: ['ELP', 'LTE', 'CAC', 'CTF']
  },
  grade: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  standardPrice: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Book = mongoose.model('Book', bookSchema);

export default Book;