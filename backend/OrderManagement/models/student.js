import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true
  },
  createdByEmployee: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Employee",
  required: true
},

  grade: {
    type: String,
    required: true,
    enum: [
      "Nursery",
      "LKG",
      "UKG",
      "1","2","3","4","5",
      "6","7","8","9","10",
      "11","12"
    ]
  },

  admissionDate: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

export default mongoose.model("Student", studentSchema);
