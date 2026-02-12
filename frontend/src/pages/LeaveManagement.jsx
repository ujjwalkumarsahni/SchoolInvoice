import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { CalendarClock, User, School, Save, Search } from 'lucide-react';
import api from '../services/api';

const leaveSchema = z.object({
  employee: z.string().min(1, 'Employee is required'),
  school: z.string().min(1, 'School is required'),
  month: z.string().min(1, 'Month is required'),
  year: z.string().min(1, 'Year is required'),
  paid: z.number().min(0, 'Paid leaves cannot be negative').default(0),
  unpaid: z.number().min(0, 'Unpaid leaves cannot be negative').default(0),
});

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const LeaveManagement = () => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [schools, setSchools] = useState([]);
  const [activePostings, setActivePostings] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const currentYear = new Date().getFullYear();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      year: currentYear.toString(),
      paid: 0,
      unpaid: 0
    }
  });

  const selectedEmployeeId = watch('employee');

  useEffect(() => {
    fetchEmployees();
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchEmployeePostings(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees/hr/employees');
      setEmployees(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      setSchools(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch schools');
    }
  };

  const fetchEmployeePostings = async (employeeId) => {
    try {
      const response = await api.get(`/postings?employee=${employeeId}&isActive=true`);
      setActivePostings(response.data.data);
      
      // Auto-select the first active school
      if (response.data.data.length > 0) {
        setValue('school', response.data.data[0].school._id);
      }
    } catch (error) {
      toast.error('Failed to fetch employee postings');
    }
  };

  const fetchExistingLeave = async (employeeId, schoolId, month, year) => {
    try {
      const response = await api.get(`/leaves/${employeeId}`);
      const existing = response.data.data.find(
        leave => 
          leave.school === schoolId && 
          leave.month === parseInt(month) && 
          leave.year === parseInt(year)
      );
      
      if (existing) {
        setValue('paid', existing.paid);
        setValue('unpaid', existing.unpaid);
      } else {
        setValue('paid', 0);
        setValue('unpaid', 0);
      }
    } catch (error) {
      console.error('Failed to fetch existing leave:', error);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      await api.post('/leaves', {
        employee: data.employee,
        school: data.school,
        month: parseInt(data.month),
        year: parseInt(data.year),
        paid: parseInt(data.paid),
        unpaid: parseInt(data.unpaid)
      });
      toast.success('Leave data saved successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save leave data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-4">
          <div className="flex items-center space-x-3">
            <CalendarClock className="h-8 w-8 text-white" />
            <h2 className="text-xl font-semibold text-white">Record Employee Leaves</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Employee <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  {...register('employee')}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose an employee</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.basicInfo?.fullName} ({emp.basicInfo?.employeeId})
                    </option>
                  ))}
                </select>
              </div>
              {errors.employee && (
                <p className="mt-1 text-sm text-red-600">{errors.employee.message}</p>
              )}
            </div>

            {/* School Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                School <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <School className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  {...register('school')}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={!selectedEmployeeId}
                >
                  <option value="">Select school</option>
                  {activePostings.map(posting => (
                    <option key={posting._id} value={posting.school._id}>
                      {posting.school.name} - {posting.school.city}
                    </option>
                  ))}
                </select>
              </div>
              {errors.school && (
                <p className="mt-1 text-sm text-red-600">{errors.school.message}</p>
              )}
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month <span className="text-red-500">*</span>
              </label>
              <select
                {...register('month')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Month</option>
                {months.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
              {errors.month && (
                <p className="mt-1 text-sm text-red-600">{errors.month.message}</p>
              )}
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year <span className="text-red-500">*</span>
              </label>
              <select
                {...register('year')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {[currentYear, currentYear - 1].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {errors.year && (
                <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
              )}
            </div>

            {/* Paid Leaves */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paid Leaves
              </label>
              <input
                type="number"
                {...register('paid', { valueAsNumber: true })}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter paid leaves"
              />
              {errors.paid && (
                <p className="mt-1 text-sm text-red-600">{errors.paid.message}</p>
              )}
            </div>

            {/* Unpaid Leaves */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unpaid Leaves
              </label>
              <input
                type="number"
                {...register('unpaid', { valueAsNumber: true })}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter unpaid leaves"
              />
              {errors.unpaid && (
                <p className="mt-1 text-sm text-red-600">{errors.unpaid.message}</p>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Total leaves (paid + unpaid) cannot exceed 31 days. 
              Unpaid leaves will be deducted from the employee's monthly salary.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Leave Data
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Leaves Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Leave Records</h3>
        </div>
        <div className="p-6">
          {/* Add table for recent leaves here */}
          <p className="text-gray-500 text-center py-8">
            Select an employee and month to view leave records
          </p>
        </div>
      </div>
    </div>
  );
};

export default LeaveManagement;