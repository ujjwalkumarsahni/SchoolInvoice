
import mongoose from "mongoose";

const employeePostingSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    // Add these fields to EmployeePosting model
    monthlyBillingSalary: {
      type: Number,
      required: [true, "Billing rate is required"],
      min: [0, "Billing rate cannot be negative"],
    },
    tdsPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    gstPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    startDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["continue", "resign", "terminate", "change_school"],
      default: "continue",
      required: true,
    },
    remark: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ✅ Virtual for total billing
employeePostingSchema.virtual("totalBilling").get(function () {
  if (!this.endDate) return null;
  const days = Math.ceil(
    (this.endDate - this.startDate) / (1000 * 60 * 60 * 24),
  );
  const months = days / 30;
  return this.billingRate * months;
});

// ✅ Pre-save validation
employeePostingSchema.pre("save", function (next) {
  if (this.isActive && !this.monthlyBillingSalary) {
    next(new Error("Billing rate is required for active postings"));
  }
  if (this.isActive && this.monthlyBillingSalary <= 0) {
    next(new Error("Billing rate must be greater than 0"));
  }
  next();
});

/* =====================================================
   🛡 LOOP PROTECTION
===================================================== */
employeePostingSchema.pre("save", function (next) {
  if (this._skipHook) return next();
  next();
});

/* =====================================================
   POST SAVE
===================================================== */
employeePostingSchema.post("save", async function (doc) {
  if (doc._skipHook) return;
  await handleTrainerUpdate(doc);
});

/* =====================================================
   POST FINDONEANDUPDATE
===================================================== */
employeePostingSchema.post("findOneAndUpdate", async function () {
  const doc = await this.model.findOne(this.getQuery());
  if (!doc || doc._skipHook) return;
  await handleTrainerUpdate(doc);
});

/* =====================================================
   🔥 MAIN LOGIC WITH BILLING RATE VALIDATION
===================================================== */
async function handleTrainerUpdate(posting) {
  const School = mongoose.model("School");
  const EmployeePosting = mongoose.model("EmployeePosting");

  const employeeId = posting.employee;
  const schoolId = posting.school;

  /* ---------------- RESIGN / TERMINATE ---------------- */
  if (posting.status === "resign" || posting.status === "terminate") {
    await School.findByIdAndUpdate(schoolId, {
      $pull: { currentTrainers: employeeId },
    });

    posting.isActive = false;
    posting.endDate = new Date();
    posting._skipHook = true;
    await posting.save({ validateBeforeSave: false });
  } else if (

  /* ---------------- CHANGE SCHOOL / CONTINUE ---------------- */
    posting.status === "change_school" ||
    posting.status === "continue"
  ) {
    //  Validate billing rate before activation
    if (!posting.billingRate || posting.billingRate <= 0) {
      console.error(`Invalid billing rate for posting ${posting._id}`);
      // Aap yahan error throw kar sakte ho ya default set kar sakte ho
      // throw new Error('Cannot activate posting without valid billing rate');
    }

    const otherPostings = await EmployeePosting.find({
      employee: employeeId,
      isActive: true,
      _id: { $ne: posting._id },
    });

    for (const old of otherPostings) {
      await School.findByIdAndUpdate(old.school, {
        $pull: { currentTrainers: employeeId },
      });

      old.isActive = false;
      old.endDate = new Date();
      old._skipHook = true;
      await old.save({ validateBeforeSave: false });
    }

    await School.findByIdAndUpdate(schoolId, {
      $addToSet: { currentTrainers: employeeId },
    });

    posting.isActive = true;
    posting._skipHook = true;
    await posting.save({ validateBeforeSave: false });
  }
}

/* =====================================================
   INDEXES - UPDATED
===================================================== */
employeePostingSchema.index({ employee: 1, isActive: 1 });
employeePostingSchema.index({ school: 1, isActive: 1 });
employeePostingSchema.index({ status: 1 });
employeePostingSchema.index({ billingRate: 1 });
employeePostingSchema.index({ school: 1, isActive: 1, billingRate: 1 });

export default mongoose.model("EmployeePosting", employeePostingSchema);
