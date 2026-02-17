// utils/cronJobs.js
import cron from 'node-cron';
import { autoGenerateInvoices } from '../controllers/invoiceController.js';

// Run at 00:05 on 1st of every month
cron.schedule('5 0 1 * *', async () => {
  console.log('Running auto invoice generation...');
  
  try {
    // Create a mock request and response
    const req = {
      user: { _id: 'system' } // System user ID
    };
    
    const res = {
      status: (code) => ({
        json: (data) => {
          console.log(`Invoice generation completed:`, data);
        }
      })
    };
    
    await autoGenerateInvoices(req, res);
  } catch (error) {
    console.error('Error in auto invoice generation:', error);
  }
});