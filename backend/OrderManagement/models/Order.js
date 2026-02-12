import mongoose from "mongoose";
import Counter from "./counterModel.js";

const orderItemSchema = new mongoose.Schema({
  bookType: {
    type: String,
    enum: ["ELP", "LTE", "CAC", "CTF"],
    required: true,
  },
  grade: {
    type: String,
    enum: [
      "Pre-Nursery",
      "LKG",
      "UKG",
      "Grade 1",
      "Grade 2",
      "Grade 3",
      "Grade 4",
      "Grade 5",
      "Grade 6",
      "Grade 7",
      "Grade 8",
      "Grade 9-12",
    ],
    required: function () {
      return (
        this.bookType !== "ELP" || (this.bookName && this.isIndividualBook)
      );
    },
  },
  bookName: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  isIndividualBook: {
    type: Boolean,
    default: false,
  },
  isComboPack: {
    type: Boolean,
    default: false,
  },
});

const kitItemSchema = new mongoose.Schema({
  kitType: {
    type: String,
    enum: ["Wonder Kit", "Nexus Kit", "Individual Kit"],
    required: true,
  },
  kitName: {
    type: String,
    trim: true,
    required: function () {
      return this.kitType === "Individual Kit";
    },
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
});

const orderSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    schoolName: {
      type: String,
      required: true,
    },
    invoiceNumber: {
      type: String,
      unique: true,
      trim: true,
    },
    academicYear: {
      type: String,
      required: true,
      default: function () {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        return `${currentYear}-${nextYear}`;
      },
    },
    orderItems: [orderItemSchema],
    kitItems: [kitItemSchema],
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    gstPercentage: {
      type: Number,
      min: 0,
    },

    gstAmount: {
      type: Number,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partial"],
      default: "pending",
    },
    // New payment fields
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      default: function () {
        return this.totalAmount - this.paidAmount;
      },
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "online", "cheque", "bank_transfer", null],
      default: null,
    },
    paymentDate: {
      type: Date,
      default: function () {
        return this.paymentStatus === "paid" || this.paymentStatus === "partial"
          ? new Date()
          : null;
      },
    },
    paymentNotes: {
      type: String,
      trim: true,
    },
    paymentHistory: [
      {
        amount: Number,
        method: String,
        notes: String,
        date: {
          type: Date,
          default: Date.now,
        },
        receivedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    dispatchStatus: {
      type: String,
      enum: ["pending", "dispatched", "delivered"],
      default: "pending",
    },
    dispatchDetails: {
      dispatchedTo: {
        type: String,
      },
      deliveredTo: {
        type: String,
      },
    },
    toAddress: {
      name: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
      mobile: String,
      email: String,
    },
    fromAddress: {
      name: {
        type: String,
        default: "Aaklan It Solutions Pvt Ltd",
      },
      address: {
        type: String,
        default:
          "IT - 9(A, EPIP, IT Park Rd, near Hotel Marigold, Sitapura Industrial Area, Sitapura, Jaipur, Rajasthan 302022",
      },
      city: {
        type: String,
        default: "Jaipur",
      },
      state: {
        type: String,
        default: "Rajasthan",
      },
      pincode: {
        type: String,
        default: "302022",
      },
      mobile: {
        type: String,
        default: "9571677609",
      },
      email: {
        type: String,
        default: "info@aaklan.com",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    dispatchedAt: Date,
    deliveredAt: Date,
    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: String,
  },
  {
    timestamps: true,
  },
);

orderSchema.pre("save", async function () {
  // ========= INVOICE NUMBER =========
  if (!this.invoiceNumber) {
    const school = await mongoose.model("School").findById(this.school);

    const schoolPrefix = school.name
      .replace(/\s/g, "")
      .substring(0, 4)
      .toUpperCase();

    const year = this.academicYear.split("-")[0];

    // SAFE ATOMIC COUNTER
    const counter = await Counter.findOneAndUpdate(
      { name: `invoice_${year}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );

    this.invoiceNumber = `${schoolPrefix}/${year}/${counter.seq}`;
  }

  // ========= CALCULATIONS =========

  const orderItemsTotal = this.orderItems.reduce(
    (s, i) => s + (i.totalPrice || 0),
    0,
  );

  const kitItemsTotal = this.kitItems.reduce(
    (s, i) => s + (i.totalPrice || 0),
    0,
  );

  this.subtotal = orderItemsTotal + kitItemsTotal;

  const afterDiscount = this.subtotal - (this.discount || 0);

  // GST
  if (this.gstPercentage && this.gstPercentage > 0) {
    this.gstAmount = (this.gstPercentage / 100) * afterDiscount;
  } else {
    this.gstPercentage = undefined;
    this.gstAmount = undefined;
  }

  this.totalAmount = afterDiscount + (this.gstAmount || 0);
});

orderSchema.pre("save", async function () {
  if (this.isModified("paidAmount") || this.isModified("totalAmount")) {
    this.remainingAmount = this.totalAmount - this.paidAmount;

    // Auto-update payment status based on amounts
    if (this.paidAmount === 0) {
      this.paymentStatus = "pending";
    } else if (this.paidAmount >= this.totalAmount) {
      this.paymentStatus = "paid";
      this.paidAmount = this.totalAmount; // Ensure paid amount doesn't exceed total
      this.remainingAmount = 0;
    } else if (this.paidAmount > 0) {
      this.paymentStatus = "partial";
    }

    // Set payment date if payment is made
    if (
      (this.paymentStatus === "paid" || this.paymentStatus === "partial") &&
      !this.paymentDate
    ) {
      this.paymentDate = new Date();
    }
  }
  // next();
});

// Virtual for isEditable
orderSchema.virtual("isEditable").get(function () {
  return this.dispatchStatus === "pending";
});

// Indexes
orderSchema.index({ school: 1 });
orderSchema.index({ academicYear: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ dispatchStatus: 1 });
orderSchema.index({ createdBy: 1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
