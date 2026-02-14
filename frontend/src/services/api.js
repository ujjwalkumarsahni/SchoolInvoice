// services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==============================
// AUTH APIS
// ==============================
export const login = (email, password) => api.post('/auth/login', { email, password });

// ==============================
// SCHOOL APIS
// ==============================
export const getSchools = (params = {}) => api.get('/schools', { params });
export const getSchool = (id) => api.get(`/schools/${id}`);
export const createSchool = (data) => api.post('/schools', data);
export const updateSchool = (id, data) => api.put(`/schools/${id}`, data);
export const deleteSchool = (id) => api.delete(`/schools/${id}`);
export const getSchoolStats = () => api.get('/schools/dashboard/stats');
export const getSchoolTrainers = (id) => api.get(`/schools/${id}/trainers`);

// ==============================
// EMPLOYEE APIS
// ==============================
export const getEmployees = (params = {}) => api.get('/employee/hr/employees', { params });
export const getEmployee = (id) => api.get(`/employee/hr/employees/${id}`); 
export const createEmployee = (data) => api.post('/employee/hr/create', data);
export const updateEmployee = (id, data) => api.put(`/employee/hr/employees/${id}`, data); 
export const deleteEmployee = (id) => api.delete(`/employee/hr/employees/${id}`); 

// ==============================
// EMPLOYEE POSTING APIS
// ==============================
export const getPostings = (params = {}) => api.get('/employee-postings', { params });
export const getPosting = (id) => api.get(`/employee-postings/${id}`);
export const createPosting = (data) => api.post('/employee-postings', data);
export const updatePosting = (id, data) => api.put(`/employee-postings/${id}`, data);
export const deletePosting = (id) => api.delete(`/employee-postings/${id}`);

// Employee Posting History
export const getEmployeePostingHistory = (employeeId) => 
  api.get(`/employee-postings/history/${employeeId}`);

// Employee Current Status
export const getEmployeeCurrentStatus = (employeeId) => 
  api.get(`/employee-postings/current/${employeeId}`);

// Posting Analytics
export const getPostingAnalytics = () => api.get('/employee-postings/analytics/overview');

// Active Employees
export const getActiveEmployees = (params = {}) => 
  api.get('/employee-postings/employees/active', { params });

export const getActiveEmployeeById = (id) => 
  api.get(`/employee-postings/employees/active/${id}`);

// ==============================
// INVOICE APIS
// ==============================
export const getInvoices = (params = {}) => api.get('/invoices', { params });
export const getInvoice = (id) => api.get(`/invoices/${id}`);
export const generateInvoice = (schoolId, month, year) => 
  api.post(`/invoices/school/${schoolId}/generate`, { month, year });
export const generateAllInvoices = (month, year) => 
  api.post('/invoices/generate', { month, year });
export const verifyInvoice = (id) => api.patch(`/invoices/${id}/verify`);
export const sendInvoices = (invoiceIds) => api.patch('/invoices/send', { invoiceIds });
export const cancelInvoice = (id) => api.delete(`/invoices/${id}`);
export const getInvoiceStats = () => api.get('/invoices/stats');

// ==============================
// PAYMENT APIS
// ==============================
export const getPayments = (params = {}) => api.get('/payments', { params });
export const getPayment = (id) => api.get(`/payments/${id}`);
export const recordPayment = (invoiceId, data) => 
  api.post(`/payments/invoice/${invoiceId}`, data);
export const verifyPayment = (id) => api.patch(`/payments/${id}/verify`);
export const getPaymentSummary = (params) => api.get('/payments/summary', { params });

// ==============================
// LEAVE APIS (if needed)
// ==============================
export const getLeaves = (params = {}) => api.get('/leaves', { params });
export const getLeave = (id) => api.get(`/leaves/${id}`);
export const createLeave = (data) => api.post('/leaves', data);
export const updateLeave = (id, data) => api.put(`/leaves/${id}`, data);
export const deleteLeave = (id) => api.delete(`/leaves/${id}`);
export const getEmployeeLeaves = (employeeId) => api.get(`/leaves/employee/${employeeId}`);
export const getSchoolLeaves = (schoolId) => api.get(`/leaves/school/${schoolId}`);

// ==============================
// LEDGER APIS (if needed)
// ==============================
export const getSchoolLedger = (schoolId, params = {}) => 
  api.get(`/ledger/school/${schoolId}`, { params });
export const getLedgerEntries = (schoolId, params = {}) => 
  api.get(`/ledger/school/${schoolId}/entries`, { params });
export const getMonthlySummary = (schoolId, year) => 
  api.get(`/ledger/school/${schoolId}/summary/${year}`);

// ==============================
// DASHBOARD APIS
// ==============================
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getRecentActivities = (limit = 10) => 
  api.get('/dashboard/activities', { params: { limit } });

// ==============================
// USER APIS (if needed)
// ==============================
export const getUsers = (params = {}) => api.get('/users', { params });
export const getUser = (id) => api.get(`/users/${id}`);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const changePassword = (data) => api.post('/users/change-password', data);

// ==============================
// HELPER FUNCTIONS
// ==============================

/**
 * Extract data from response based on common patterns
 * @param {Object} response - API response
 * @returns {Array|Object} - Extracted data
 */
export const extractData = (response) => {
  if (!response) return null;
  
  if (response.data) {
    // Case: { data: [...] }
    if (Array.isArray(response.data)) return response.data;
    
    // Case: { data: { data: [...] } }
    if (response.data.data && Array.isArray(response.data.data)) 
      return response.data.data;
    
    // Case: { data: { items: [...] } }
    if (response.data.items && Array.isArray(response.data.items)) 
      return response.data.items;
    
    // Case: { data: { results: [...] } }
    if (response.data.results && Array.isArray(response.data.results)) 
      return response.data.results;
    
    // Case: { data: { ... } } - single object
    if (response.data.data && typeof response.data.data === 'object') 
      return response.data.data;
    
    // Default: return response.data
    return response.data;
  }
  
  return response;
};

/**
 * Handle API error and return user-friendly message
 * @param {Error} error - Error object
 * @returns {string} - User-friendly error message
 */
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return data.message || 'Bad request. Please check your input.';
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'Resource not found.';
      case 422:
        return data.message || 'Validation failed. Please check your input.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return data.message || 'An error occurred. Please try again.';
    }
  } else if (error.request) {
    // Request made but no response
    return 'Network error. Please check your internet connection.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred.';
  }
};

export default api;