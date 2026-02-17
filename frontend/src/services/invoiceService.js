// services/invoiceService.js
import api from './api'; // Aapka existing API service

const invoiceService = {
  // Get all invoices with filters
  getInvoices: (params) => api.get('/invoices', { params }),
  
  // Get single invoice
  getInvoice: (id) => api.get(`/invoices/${id}`),
  
  // Get invoice stats
  getStats: (params) => api.get('/invoices/stats', { params }),
  
  // Auto-generate invoices
  autoGenerate: (data) => api.post('/invoices/auto-generate',data),
  
  // Verify invoice
  verifyInvoice: (id, data) => api.put(`/invoices/${id}/verify`, data),
  
  // Bulk send invoices
  sendBulk: (invoiceIds) => api.post('/invoices/send-bulk', { invoiceIds }),
  
  // Record payment
  recordPayment: (id, data) => api.post(`/invoices/${id}/payment`, data),
  
  // Download invoice PDF
  downloadInvoice: (id) => api.get(`/invoices/${id}/download`, {
    responseType: 'blob'
  }),
  
  // Cancel invoice
  cancelInvoice: (id, reason) => api.delete(`/invoices/${id}`, { data: { reason } })
};

export default invoiceService;