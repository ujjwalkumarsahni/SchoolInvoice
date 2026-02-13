import cron from 'node-cron';
import { generateAllInvoices } from '../services/invoiceGenerationService.js';
import { updateOverdueInvoices } from '../services/carryForwardService.js';
import User from '../models/User.js';

/**
 * Run on 1st of every month at 2:00 AM
 * Generates invoices for previous month
 */
export const setupInvoiceCron = () => {
  // Run at 2:00 AM on the 1st of every month
  cron.schedule('0 2 1 * *', async () => {
    console.log('🚀 Running monthly invoice generation cron job...');
    
    try {
      const now = new Date();
      
      // Calculate previous month
      let month = now.getMonth(); // 0-11
      let year = now.getFullYear();
      
      if (month === 0) {
        month = 12;
        year = year - 1;
      }
      
      console.log(`📅 Generating invoices for ${month}/${year}`);
      
      // Find a system user (first admin) to set as creator
      const systemUser = await User.findOne({ role: 'superadmin' });
      
      if (!systemUser) {
        console.error('❌ No system user found for cron job');
        return;
      }
      
      // Generate all invoices
      const results = await generateAllInvoices(month, year, systemUser._id);
      
      console.log('✅ Invoice generation completed:');
      console.log(`   Successful: ${results.successful.length}`);
      console.log(`   Failed: ${results.failed.length}`);
      
      if (results.successful.length > 0) {
        console.log('   Generated invoices:');
        results.successful.forEach(inv => {
          console.log(`   - ${inv.school}: ${inv.invoiceNumber} (${inv.amount})`);
        });
      }
      
      if (results.failed.length > 0) {
        console.log('   Failed invoices:');
        results.failed.forEach(f => {
          console.log(`   - ${f.school}: ${f.reason}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error in monthly invoice cron:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });
  
  console.log('⏰ Monthly invoice cron job scheduled');
};

/**
 * Run daily at 1:00 AM to update overdue invoices
 */
export const setupOverdueCron = () => {
  cron.schedule('0 1 * * *', async () => {
    console.log('🚀 Running overdue invoice update cron job...');
    
    try {
      const result = await updateOverdueInvoices();
      console.log(`✅ Updated ${result.modifiedCount} overdue invoices`);
    } catch (error) {
      console.error('❌ Error in overdue cron:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });
  
  console.log('⏰ Overdue invoice cron job scheduled');
};

/**
 * Initialize all cron jobs
 */
export const initializeCronJobs = () => {
  setupInvoiceCron();
  setupOverdueCron();
};