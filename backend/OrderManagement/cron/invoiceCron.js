import cron from "node-cron";
import { generateInvoiceLogic } from "../services/invoiceService.js";
import School from "../models/School.js";

/*
RUNS: 1st day of every month at 1AM
*/
cron.schedule("0 1 1 * *", async ()=>{

  console.log("🔁 Running Monthly Invoice Cron");

  const now = new Date();

  const month = now.getMonth(); // previous month
  const year = now.getFullYear();

  const schools = await School.find({status:"active"});

  for(const school of schools){

    try{
      await generateInvoiceLogic({
        schoolId:school._id,
        month,
        year
      });

      console.log(`✅ Invoice created for ${school.name}`);

    }catch(err){
      console.log(`❌ ${school.name}`,err.message);
    }
  }

});
