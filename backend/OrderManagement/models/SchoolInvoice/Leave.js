import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({

  employee:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Employee"
  },

  school:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"School"
  },

  month:Number,
  year:Number,

  paid:{
    type:Number,
    default:0
  },

  unpaid:{
    type:Number,
    default:0
  }

});

leaveSchema.pre("save", async function(){
  if(this.paid + this.unpaid > 31){
    return next(new Error("Leaves exceed days in month"));
  }
});


leaveSchema.index(
 { employee:1, school:1, month:1, year:1 },
 { unique:true }
);

export default mongoose.model("Leave",leaveSchema);
