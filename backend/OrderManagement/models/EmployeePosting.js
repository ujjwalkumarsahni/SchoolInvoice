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
    monthlyBillingSalary: {
      type: Number,
      required: true,
    },

    tdsPercent: {
      type: Number,
      default: 0,
    },

    gstPercent: {
      type: Number,
      default: 0,
    },

    salaryHistory: [ // ye to track salary changes over time
      {
        amount: Number,
        from: Date,
        to: Date,
      },
    ],
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
  { timestamps: true },
);

/* =====================================================
   🛡 LOOP PROTECTION
===================================================== */
// employeePostingSchema.pre('save', function () {
//   if (this._skipHook) return next();
//   // next();
// });


employeePostingSchema.pre("save", async function(){
  if(this.endDate && this.endDate < this.startDate){
    return next(new Error("End date cannot be before start date"));
  }
});

employeePostingSchema.pre("save", async function(){

  if(this.isModified("monthlyBillingSalary")){
    this.salaryHistory.push({
      amount:this.monthlyBillingSalary,
      from:new Date()
    });
  }
});


/* =====================================================
   POST SAVE
===================================================== */
employeePostingSchema.post("save", async function (doc) {
  if (doc._skipHook) return;
  await handleTrainerUpdate(doc);
});

/* =====================================================
   POST FINDONEANDUPDATE (🔥 VERY IMPORTANT)
===================================================== */
employeePostingSchema.post("findOneAndUpdate", async function () {
  const doc = await this.model.findOne(this.getQuery());
  if (!doc || doc._skipHook) return;
  await handleTrainerUpdate(doc);
});

/* =====================================================
   🔥 MAIN LOGIC (RESIGN FIXED)
===================================================== */
async function handleTrainerUpdate(posting) {
  const School = mongoose.model("School");
  const EmployeePosting = mongoose.model("EmployeePosting");

  const employeeId = posting.employee;
  const schoolId = posting.school;

  /* ---------------- RESIGN / TERMINATE ---------------- */
  if (posting.status === "resign" || posting.status === "terminate") {
    // ✅ School se remove
    await School.findByIdAndUpdate(schoolId, {
      $pull: { currentTrainers: employeeId },
    });

    // ✅ Posting inactive
    posting.isActive = false;
    posting.endDate = new Date();
    posting._skipHook = true;
    await posting.save({ validateBeforeSave: false });
  } else if (posting.status === "change_school") {
    /* ---------------- CHANGE SCHOOL ---------------- */
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
  } else if (posting.status === "continue") {
    /* ---------------- CONTINUE ---------------- */
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
   INDEXES
===================================================== */
employeePostingSchema.index({ employee: 1, isActive: 1 });
employeePostingSchema.index({ school: 1, isActive: 1 });
employeePostingSchema.index({ status: 1 });
employeePostingSchema.index(
  { employee: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);
export default mongoose.model("EmployeePosting", employeePostingSchema);
