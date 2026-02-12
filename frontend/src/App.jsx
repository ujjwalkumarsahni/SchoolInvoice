import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';

// Layout
import Layout from './components/Layout.jsx';

// Auth Pages
import Login from './pages/Login.jsx';

// Main Pages
import Dashboard from './pages/Dashboard.jsx';
import Schools from './pages/Schools.jsx';
import CreateSchool from './pages/CreateSchool.jsx';
import EditSchool from './pages/EditSchool.jsx';
import SchoolDetails from './pages/SchoolDetails.jsx';

import Employees from './pages/Employees.jsx';
import CreateEmployee from './pages/CreateEmployee.jsx';
import EmployeeDetails from './pages/EmployeeDetails.jsx';

import EmployeePosting from './pages/EmployeePosting.jsx';
import CreateEmployeePosting from './pages/CreateEmployeePosting.jsx';

import Invoice from './pages/Invoice.jsx';
import CreateInvoice from './pages/CreateInvoice.jsx';
import InvoiceDetails from './pages/InvoiceDetails.jsx';

import LeaveManagement from './pages/LeaveManagement.jsx';
import EditEmployee from './pages/EditEmployee.jsx';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* School Routes */}
            <Route path="schools">
              <Route index element={<Schools />} />
              <Route path="create" element={<CreateSchool />} />
              <Route path="edit/:id" element={<EditSchool />} />
              <Route path=":id" element={<SchoolDetails />} />
            </Route>
            
            {/* Employee Routes */}
            <Route path="employees">
              <Route index element={<Employees />} />
              <Route path="create" element={<CreateEmployee />} />
              <Route path=":id" element={<EmployeeDetails />} />
              <Route path="edit/:id" element={<EditEmployee />} />
            </Route>
            
            {/* Employee Posting Routes */}
            <Route path="postings">
              <Route index element={<EmployeePosting />} />
              <Route path="create" element={<CreateEmployeePosting />} />
            </Route>
            
            {/* Invoice Routes */}
            <Route path="invoices">
              <Route index element={<Invoice />} />
              <Route path="create" element={<CreateInvoice />} />
              <Route path=":id" element={<InvoiceDetails />} />
            </Route>
            
            {/* Leave Management */}
            <Route path="leaves" element={<LeaveManagement />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;