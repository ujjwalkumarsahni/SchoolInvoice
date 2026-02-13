import mongoose from 'mongoose';

const userRoleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['teacher', 'student', 'admin', 'hr', 'employee'],
    required: true
  },
  // permissions: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Permission',
  //   required: true
  // },
  customPermissions: {
    // Override default permissions for specific user
    templates: {
      access: [String],
      restrictions: [String]
    },
    features: {
      enabled: [String],
      disabled: [String]
    },
    limits: {
      dailyAiGenerations: Number,
      maxContentItems: Number,
      maxStorageMB: Number
    }
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  expiresAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
userRoleSchema.index({ user: 1, isActive: 1 });
userRoleSchema.index({ role: 1, isActive: 1 });

export default mongoose.model('UserRole', userRoleSchema);
