import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { 
  UserPlus, 
  School, 
  DollarSign, 
  Percent, 
  Calendar, 
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Building2,
  Users
} from 'lucide-react';
import api from '../services/api.js';

const postingSchema = z.object({
  employee: z.string().min(1, 'Employee is required'),
  school: z.string().min(1, 'School is required'),
  monthlyBillingSalary: z.number().min(1, 'Monthly billing salary is required'),
  tdsPercent: z.number().min(0, 'TDS percent must be positive').default(0),
  gstPercent: z.number().min(0, 'GST percent must be positive').default(0),
  status: z.string().default('continue'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  remark: z.string().optional(),
});

const CreateEmployeePosting = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [schools, setSchools] = useState([]);
  const [fetchingEmployees, setFetchingEmployees] = useState(true);
  const [fetchingSchools, setFetchingSchools] = useState(true);
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(postingSchema),
    defaultValues: {
      status: 'continue',
      tdsPercent: 0,
      gstPercent: 0,
      startDate: new Date().toISOString().split('T')[0]
    }
  });

  const selectedEmployeeId = watch('employee');
  const selectedSchoolId = watch('school');
  const monthlySalary = watch('monthlyBillingSalary');
  const tdsPercent = watch('tdsPercent');
  const gstPercent = watch('gstPercent');

  useEffect(() => {
    fetchEmployees();
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      const employee = employees.find(emp => emp._id === selectedEmployeeId);
      setSelectedEmployeeDetails(employee);
    }
  }, [selectedEmployeeId, employees]);

  const fetchEmployees = async () => {
    try {
      setFetchingEmployees(true);
      // ✅ FIXED: Correct API endpoint
      const response = await api.get('/employee/hr/employees?status=Active');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Fetch employees error:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setFetchingEmployees(false);
    }
  };

  const fetchSchools = async () => {
    try {
      setFetchingSchools(true);
      // ✅ FIXED: Correct API endpoint
      const response = await api.get('/schools?status=active');
      setSchools(response.data.data || []);
    } catch (error) {
      console.error('Fetch schools error:', error);
      toast.error('Failed to fetch schools');
    } finally {
      setFetchingSchools(false);
    }
  };

  // Calculate net amount after TDS
  const calculateNetAmount = () => {
    if (!monthlySalary) return 0;
    const tdsAmount = monthlySalary * (tdsPercent / 100);
    return monthlySalary - tdsAmount;
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // ✅ FIXED: Correct API endpoint
      const response = await api.post('/employee-postings', {
        employee: data.employee,
        school: data.school,
        monthlyBillingSalary: parseFloat(data.monthlyBillingSalary),
        tdsPercent: parseFloat(data.tdsPercent || 0),
        gstPercent: parseFloat(data.gstPercent || 0),
        status: data.status,
        startDate: data.startDate || new Date().toISOString(),
        endDate: data.endDate || null,
        remark: data.remark || ''
      });

      toast.success(response.data.message || 'Employee posting created successfully!');
      navigate('/postings');
    } catch (error) {
      console.error('Create posting error:', error);
      toast.error(error.response?.data?.message || 'Failed to create posting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-4">
          <div className="flex items-center space-x-3">
            <UserPlus className="h-8 w-8 text-white" />
            <div>
              <h2 className="text-xl font-semibold text-white">Create Employee Posting</h2>
              <p className="text-sm text-indigo-100 mt-1">Assign employee to school with billing details</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Employee Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Employee <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('employee')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={fetchingEmployees}
                >
                  <option value="">
                    {fetchingEmployees ? 'Loading employees...' : 'Choose an employee'}
                  </option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.basicInfo?.fullName} ({emp.basicInfo?.employeeId}) - {emp.basicInfo?.designation}
                    </option>
                  ))}
                </select>
                {errors.employee && (
                  <p className="mt-1 text-sm text-red-600">{errors.employee.message}</p>
                )}
              </div>

              {/* School Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select School <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <School className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    {...register('school')}
                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={fetchingSchools}
                  >
                    <option value="">
                      {fetchingSchools ? 'Loading schools...' : 'Choose a school'}
                    </option>
                    {schools.map(school => (
                      <option key={school._id} value={school._id}>
                        {school.name} - {school.city}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.school && (
                  <p className="mt-1 text-sm text-red-600">{errors.school.message}</p>
                )}
              </div>

              {/* Monthly Billing Salary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Billing Salary <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    {...register('monthlyBillingSalary', { valueAsNumber: true })}
                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter monthly salary"
                  />
                </div>
                {errors.monthlyBillingSalary && (
                  <p className="mt-1 text-sm text-red-600">{errors.monthlyBillingSalary.message}</p>
                )}
              </div>

              {/* TDS & GST */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TDS %
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      {...register('tdsPercent', { valueAsNumber: true })}
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST %
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      {...register('gstPercent', { valueAsNumber: true })}
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posting Status
                </label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="continue">Continue (New Posting)</option>
                  <option value="change_school">Change School (Transfer)</option>
                  <option value="resign">Resignation</option>
                  <option value="terminate">Termination</option>
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      {...register('startDate')}
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      {...register('endDate')}
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remark / Notes
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    {...register('remark')}
                    rows="4"
                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter any remarks, transfer reason, or additional notes..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Selected Employee Details */}
          {selectedEmployeeDetails && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Users className="h-4 w-4 mr-2 text-gray-500" />
                Selected Employee Details
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="text-sm font-medium text-gray-900">{selectedEmployeeDetails.basicInfo?.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Employee ID</p>
                  <p className="text-sm font-medium text-gray-900">{selectedEmployeeDetails.basicInfo?.employeeId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Designation</p>
                  <p className="text-sm font-medium text-gray-900">{selectedEmployeeDetails.basicInfo?.designation}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="text-sm font-medium text-gray-900">{selectedEmployeeDetails.basicInfo?.department}</p>
                </div>
              </div>
            </div>
          )}

          {/* Selected School Details */}
          {selectedSchoolId && schools.find(s => s._id === selectedSchoolId) && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                Selected School Details
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">School Name</p>
                  <p className="text-sm font-medium text-gray-900">
                    {schools.find(s => s._id === selectedSchoolId)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">City</p>
                  <p className="text-sm font-medium text-gray-900">
                    {schools.find(s => s._id === selectedSchoolId)?.city}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    {schools.find(s => s._id === selectedSchoolId)?.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Calculation Summary */}
          {monthlySalary > 0 && (
            <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <h4 className="text-sm font-medium text-indigo-800 mb-3 flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-indigo-600" />
                Billing Summary
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-indigo-600">Monthly Salary</p>
                  <p className="text-lg font-bold text-indigo-900">₹{monthlySalary.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-600">TDS ({tdsPercent || 0}%)</p>
                  <p className="text-lg font-bold text-red-600">- ₹{((monthlySalary * (tdsPercent || 0)) / 100).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-600">Net Amount</p>
                  <p className="text-lg font-bold text-green-600">₹{calculateNetAmount().toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-600">GST ({gstPercent || 0}%)</p>
                  <p className="text-lg font-bold text-indigo-600">+ ₹{((monthlySalary * (gstPercent || 0)) / 100).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Important Notes */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-blue-600" />
              Important Information
            </h4>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Posting will be activated immediately if start date is today or in the past</li>
              <li>Employee will be automatically added to school's current trainers list</li>
              <li>Any previous active posting for this employee will be deactivated</li>
              <li>Select "Change School" to transfer employee to a different school</li>
              <li>End date is optional - leave blank for indefinite posting</li>
              <li>Monthly billing salary is mandatory for invoice generation</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/postings')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || fetchingEmployees || fetchingSchools}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Posting...
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  Create Posting
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEmployeePosting;