  import mongoose from "mongoose";
  const invoiceSchema = new mongoose.Schema({

    invoiceNumber:{ type:String, unique:true },

    school:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"School"
    },

    month:Number,
    year:Number,

    /* ===== BILL DETAILS ===== */

    employees:[{
      employee:{ type:mongoose.Schema.Types.ObjectId, ref:"Employee" },

      billingSalary:Number,
      daysWorked:Number,
      leaveDeduction:Number,

      grossAmount:Number,
      tdsAmount:Number,
      finalAmount:Number
    }],

    subtotal:Number,
    gstAmount:Number,

    currentBillTotal:Number, // current month only

    /* ===== AR FIELDS ===== */

    previousDue:{ type:Number, default:0 },

    adjustment:{ type:Number, default:0 }, 
    // (-) discount / (+) extra charge

    grandTotal:Number,

    paidAmount:{ type:Number, default:0 },

    pendingAmount:{ type:Number, default:0 },

    paymentHistory:[
      {
        amount:Number,
        date:{ type:Date, default:Date.now },
        note:String
      }
    ],

    status:{
      type:String,
      enum:["generated","partial","paid"],
      default:"generated"
    }

  },{timestamps:true});


  /* AUTO INVOICE NUMBER */
  invoiceSchema.pre("save", async function(){
    if(!this.invoiceNumber){
      const count = await mongoose.model("Invoice").countDocuments();
      this.invoiceNumber =
        `INV-${new Date().getFullYear()}-${count+1}`;
    }
  });

  /* ONE INVOICE PER MONTH */
  invoiceSchema.index(
  { school:1, month:1, year:1 },
  { unique:true }
  );

  export default mongoose.model("Invoice", invoiceSchema);
