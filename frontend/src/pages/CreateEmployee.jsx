import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { 
  User, 
  Mail, 
  Lock, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  Building2,
  UserCog,
  Shield,
  Users 
} from 'lucide-react';
import api from '../services/api.js';

const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  designation: z.string().min(1, 'Designation is required'),
  department: z.string().min(1, 'Department is required'),
  reportingManager: z.string().min(1, 'Reporting manager is required'),
  dateOfJoining: z.string().min(1, 'Date of joining is required'),
  employmentType: z.string().min(1, 'Employment type is required'),
  workMode: z.string().min(1, 'Work mode is required'),
  workLocation: z.string().min(1, 'Work location is required'),
  salary: z.number().min(0, 'Salary must be positive'),
});

const CreateEmployee = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);
  const [fetchingManagers, setFetchingManagers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      salary: 0
    }
  });

  useEffect(() => {
    fetchReportingManagers();
  }, []);

  const fetchReportingManagers = async () => {
    try {
      setFetchingManagers(true);
      // ✅ New dedicated endpoint for reporting managers
      const response = await api.get('/employee/reporting-managers');
      setManagers(response.data.data || []);
      
      if (response.data.data.length === 0) {
        toast.error('No reporting managers found. Please create an admin/HR first.');
      }
    } catch (error) {
      console.error('Failed to fetch managers:', error);
      toast.error('Failed to load reporting managers list');
    } finally {
      setFetchingManagers(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // ✅ reportingManager field me USER ID jayega (Employee ID nahi)
      await api.post('/employee/hr/create', {
        name: data.name,
        email: data.email,
        password: data.password,
        employeeId: data.employeeId,
        designation: data.designation,
        department: data.department,
        reportingManager: data.reportingManager, // ✅ YEH USER ID HAI
        dateOfJoining: data.dateOfJoining,
        employmentType: data.employmentType,
        workMode: data.workMode,
        workLocation: data.workLocation,
        salary: parseFloat(data.salary),
        role: 'employee'
      });
      
      toast.success('Employee created successfully!');
      navigate('/employees');
    } catch (error) {
      console.error('Create employee error:', error);
      toast.error(error.response?.data?.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'hr': return 'bg-purple-100 text-purple-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-4">
          <div className="flex items-center space-x-3">
            <User className="h-8 w-8 text-white" />
            <h2 className="text-xl font-semibold text-white">Create New Employee</h2>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  {...register('name')}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter full name"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Employee ID */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('employeeId')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter employee ID"
              />
              {errors.employeeId && (
                <p className="mt-1 text-sm text-red-600">{errors.employeeId.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  {...register('email')}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  {...register('password')}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter password"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Designation */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  {...register('designation')}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter designation"
                />
              </div>
              {errors.designation && (
                <p className="mt-1 text-sm text-red-600">{errors.designation.message}</p>
              )}
            </div>

            {/* Department */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                {...register('department')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Department</option>
                <option value="IT">IT</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Marketing">Marketing</option>
                <option value="Operations">Operations</option>
                <option value="Sales">Sales</option>
                <option value="Training">Training</option>
              </select>
              {errors.department && (
                <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
              )}
            </div>

            {/* Reporting Manager - IMPROVED */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reporting Manager <span className="text-red-500">*</span>
                <span className="ml-2 text-xs text-gray-500">(Admin, HR, or Senior Employee)</span>
              </label>
              <div className="relative">
                <UserCog className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  {...register('reportingManager')}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={fetchingManagers || managers.length === 0}
                >
                  <option value="">
                    {fetchingManagers 
                      ? 'Loading managers...' 
                      : managers.length === 0 
                        ? 'No managers available' 
                        : 'Select Reporting Manager'}
                  </option>
                  {managers.map(manager => (
                    <option key={manager._id} value={manager._id}>
                      {manager.name} ({manager.employeeId || 'No Emp ID'}) - {manager.role.toUpperCase()} - {manager.designation}
                    </option>
                  ))}
                </select>
              </div>
              {errors.reportingManager && (
                <p className="mt-1 text-sm text-red-600">{errors.reportingManager.message}</p>
              )}
              
              {/* Available Managers List */}
              {managers.length > 0 && (
                <div className="mt-3 bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    Available Reporting Managers ({managers.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {managers.slice(0, 3).map(manager => (
                      <span 
                        key={manager._id}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-white border border-gray-200"
                      >
                        <span className={`w-2 h-2 rounded-full mr-1 ${
                          manager.role === 'admin' ? 'bg-red-500' : 
                          manager.role === 'hr' ? 'bg-purple-500' : 'bg-blue-500'
                        }`}></span>
                        {manager.name} 
                        <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${getRoleBadgeColor(manager.role)}`}>
                          {manager.role}
                        </span>
                      </span>
                    ))}
                    {managers.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{managers.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Date of Joining */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Joining <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  {...register('dateOfJoining')}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {errors.dateOfJoining && (
                <p className="mt-1 text-sm text-red-600">{errors.dateOfJoining.message}</p>
              )}
            </div>

            {/* Employment Type */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('employmentType')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Type</option>
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Intern">Intern</option>
                <option value="Contract">Contract</option>
              </select>
              {errors.employmentType && (
                <p className="mt-1 text-sm text-red-600">{errors.employmentType.message}</p>
              )}
            </div>

            {/* Work Mode */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Mode <span className="text-red-500">*</span>
              </label>
              <select
                {...register('workMode')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Work Mode</option>
                <option value="Onsite">Onsite</option>
                <option value="Work-from-Home">Work from Home</option>
                <option value="Hybrid">Hybrid</option>
              </select>
              {errors.workMode && (
                <p className="mt-1 text-sm text-red-600">{errors.workMode.message}</p>
              )}
            </div>

            {/* Work Location */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  {...register('workLocation')}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter work location"
                />
              </div>
              {errors.workLocation && (
                <p className="mt-1 text-sm text-red-600">{errors.workLocation.message}</p>
              )}
            </div>

            {/* Salary */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  {...register('salary', { valueAsNumber: true })}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter salary"
                />
              </div>
              {errors.salary && (
                <p className="mt-1 text-sm text-red-600">{errors.salary.message}</p>
              )}
            </div>
          </div>

          {/* Important Information Box */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
              <Shield className="h-4 w-4 mr-1" />
              Reporting Manager Information
            </h4>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Reporting manager can be <strong>Admin, HR, or any Active Employee</strong></li>
              <li>System stores <strong>User ID</strong> (not Employee ID) for the manager</li>
              <li>Manager must have an active account in the system</li>
              <li>You cannot assign yourself as reporting manager</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || fetchingManagers || managers.length === 0}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Employee'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEmployee;