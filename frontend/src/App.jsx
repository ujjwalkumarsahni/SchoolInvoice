import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./context/AuthContext.jsx";
import PrivateRoute from "./components/Common/PrivateRoute.jsx";
import Layout from "./components/Layout/Layout.jsx";

import Login from "./pages/Login.jsx";

import EmployeePostings from "./pages/EmployeePostings/EmployeePostings.jsx";
import CreatePosting from "./pages/EmployeePostings/CreatePosting.jsx";
import PostingDetails from "./pages/EmployeePostings/PostingDetails.jsx";
import EmployeeHistory from "./pages/EmployeePostings/EmployeeHistory.jsx";
import PostingAnalytics from "./pages/EmployeePostings/PostingAnalytics.jsx";

import EmployeeList from "./pages/Employees/EmployeeList.jsx";
import CreateEmployee from "./pages/Employees/CreateEmployee.jsx";
import EmployeeDetails from "./pages/Employees/EmployeeDetails.jsx";

import SchoolList from "./pages/Schools/SchoolList.jsx";
import CreateSchool from "./pages/Schools/CreateSchool.jsx";
import SchoolDetails from "./pages/Schools/SchoolDetails.jsx";
import Dashboard from "./pages/Dashboard.jsx"
function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: "#363636", color: "#fff" },
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Private Layout */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard */}
            <Route path="dashboard" element={<Dashboard />} />

            {/* ================= SCHOOLS ================= */}
            <Route path="schools">
              <Route index element={<SchoolList />} />
              <Route path="new" element={<CreateSchool />} />
              <Route path="edit/:id" element={<CreateSchool />} />
              <Route path=":id" element={<SchoolDetails />} />
            </Route>

            {/* ================= EMPLOYEES ================= */}
            <Route path="employees">
              <Route index element={<EmployeeList />} />
              <Route path="new" element={<CreateEmployee />} />
              <Route path="edit/:id" element={<CreateEmployee />} />
              <Route path=":id" element={<EmployeeDetails />} />
            </Route>

            {/* ================= POSTINGS ================= */}
            <Route path="postings">
              <Route index element={<EmployeePostings />} />
              <Route path="new" element={<CreatePosting />} />
              <Route path="analytics" element={<PostingAnalytics />} />
              <Route
                path="history/:employeeId"
                element={<EmployeeHistory />}
              />
              <Route path=":id" element={<PostingDetails />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
