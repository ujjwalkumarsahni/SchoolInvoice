import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['teacher', 'student', 'admin', 'hr', 'employee'],
    default: 'teacher'
  },
  organization: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  profile: {
    avatar: String || null,
    bio: String,
    subjects: [String],
    grades: [String]
  }
}, {
  timestamps: true
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});


// Virtual for user activities
userSchema.virtual('activities', {
  ref: 'UserActivity',
  localField: '_id',
  foreignField: 'user'
});

// Virtual for user roles
userSchema.virtual('roles', {
  ref: 'UserRole',
  localField: '_id',
  foreignField: 'user'
});

export default mongoose.model('User', userSchema);

