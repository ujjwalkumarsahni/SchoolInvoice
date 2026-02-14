// pages/EmployeePostings/CreatePosting.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserIcon,
  BuildingOfficeIcon,
  CurrencyRupeeIcon,
  CalendarIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import { createPosting } from '../../services/api.js';
import { getSchools } from '../../services/api.js';
import { getActiveEmployees } from '../../services/api.js';
import Button from '../../components/Common/Button.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext.jsx';

const CreatePosting = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [employees, setEmployees] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    employee: location.state?.employeeId || '',
    school: location.state?.schoolId || '',
    monthlyBillingSalary: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'continue',
    remark: '',
    tdsPercent: 0,
    gstPercent: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [employeesRes, schoolsRes] = await Promise.all([
        getActiveEmployees(),
        getSchools()
      ]);
      
      let employeesData = [];
      if (employeesRes.data) {
        if (Array.isArray(employeesRes.data)) {
          employeesData = employeesRes.data;
        } else if (employeesRes.data.data && Array.isArray(employeesRes.data.data)) {
          employeesData = employeesRes.data.data;
        }
      }
      setEmployees(employeesData);
      
      let schoolsData = [];
      if (schoolsRes.data) {
        if (Array.isArray(schoolsRes.data)) {
          schoolsData = schoolsRes.data;
        } else if (schoolsRes.data.data && Array.isArray(schoolsRes.data.data)) {
          schoolsData = schoolsRes.data.data;
        }
      }
      setSchools(schoolsData);
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load required data');
    } finally {
      setFetchingData(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.employee) newErrors.employee = 'Please select an employee';
    if (!formData.school) newErrors.school = 'Please select a school';
    if (!formData.monthlyBillingSalary) {
      newErrors.monthlyBillingSalary = 'Monthly billing salary is required';
    } else if (formData.monthlyBillingSalary <= 0) {
      newErrors.monthlyBillingSalary = 'Salary must be greater than 0';
    }
    if (!formData.startDate) newErrors.startDate = 'Start date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      await createPosting(formData);
      toast.success('Employee posting created successfully');
      navigate('/postings');
    } catch (error) {
      console.error('Create posting error:', error);
      toast.error(error.response?.data?.message || 'Failed to create posting');
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = employees.find(emp => emp._id === formData.employee);
  const selectedSchool = schools.find(sch => sch._id === formData.school);

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/postings')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Postings
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Create Employee Posting</h1>
        <p className="text-gray-500 mt-1">Assign an employee to a school with billing details</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Employee Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Employee <span className="text-red-500">*</span>
              </label>
              <select
                name="employee"
                value={formData.employee}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.employee ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Choose an employee</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.basicInfo?.fullName} - {emp.basicInfo?.employeeId} ({emp.basicInfo?.designation})
                  </option>
                ))}
              </select>
              {errors.employee && <p className="mt-1 text-sm text-red-600">{errors.employee}</p>}
              
              {selectedEmployee && (
                <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-4 h-4 text-blue-700" />
                    </div>
                    <div className="text-sm text-blue-700">
                      <p><span className="font-medium">Department:</span> {selectedEmployee.basicInfo?.department}</p>
                      <p><span className="font-medium">Employment Type:</span> {selectedEmployee.basicInfo?.employmentType}</p>
                      <p><span className="font-medium">Work Mode:</span> {selectedEmployee.basicInfo?.workMode}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* School Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select School <span className="text-red-500">*</span>
              </label>
              <select
                name="school"
                value={formData.school}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.school ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Choose a school</option>
                {schools.filter(s => s.status === 'active').map(sch => (
                  <option key={sch._id} value={sch._id}>
                    {sch.name} - {sch.city} (Need: {sch.trainersRequired} trainers)
                  </option>
                ))}
              </select>
              {errors.school && <p className="mt-1 text-sm text-red-600">{errors.school}</p>}
              
              {selectedSchool && (
                <div className="mt-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-3">
                    <BuildingOfficeIcon className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-700">
                      <p><span className="font-medium">Contact:</span> {selectedSchool.contactPersonName}</p>
                      <p><span className="font-medium">Current Trainers:</span> {selectedSchool.currentTrainers?.length || 0} / {selectedSchool.trainersRequired}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Billing Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Billing Salary (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <CurrencyRupeeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="monthlyBillingSalary"
                    value={formData.monthlyBillingSalary}
                    onChange={handleInputChange}
                    min="0"
                    step="1000"
                    placeholder="e.g., 50000"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.monthlyBillingSalary ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.monthlyBillingSalary && <p className="mt-1 text-sm text-red-600">{errors.monthlyBillingSalary}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
              </div>
            </div>

            {/* Tax Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">TDS Percentage</label>
                <input
                  type="number"
                  name="tdsPercent"
                  value={formData.tdsPercent}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 10"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GST Percentage</label>
                <input
                  type="number"
                  name="gstPercent"
                  value={formData.gstPercent}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 18"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="continue">Continue</option>
                <option value="change_school">Change School</option>
                <option value="resign">Resign</option>
                <option value="terminate">Terminate</option>
              </select>
            </div>

            {/* Remark */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remark</label>
              <textarea
                name="remark"
                value={formData.remark}
                onChange={handleInputChange}
                rows="3"
                placeholder="Any additional notes..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Info Box */}
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">Important Notes:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                    <li>Only active employees can be assigned to schools</li>
                    <li>An employee can only have one active posting at a time</li>
                    <li>Billing rate is what the school will be charged per month</li>
                    <li>TDS and GST will be applied to invoices if specified</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/postings')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
            >
              Create Posting
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePosting;