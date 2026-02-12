import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { FileText, School, Calendar, PlusCircle, DollarSign, Percent } from 'lucide-react';
import api from '../services/api.js';

const invoiceSchema = z.object({
  schoolId: z.string().min(1, 'School is required'),
  month: z.string().min(1, 'Month is required'),
  year: z.string().min(1, 'Year is required'),
  adjustment: z.number().default(0),
});

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const currentYear = new Date().getFullYear();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue
  } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      adjustment: 0,
      year: currentYear.toString()
    }
  });

  const selectedSchoolId = watch('schoolId');
  const selectedMonth = watch('month');
  const selectedYear = watch('year');

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchoolId && selectedMonth && selectedYear) {
      fetchPreview();
    }
  }, [selectedSchoolId, selectedMonth, selectedYear]);

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      setSchools(response.data.data.filter(s => s.status === 'active'));
    } catch (error) {
      toast.error('Failed to fetch schools');
    }
  };

  const fetchPreview = async () => {
    try {
      setFetchingPreview(true);
      // This is a preview endpoint - you might need to implement this
      const response = await api.get(`/invoices/preview`, {
        params: {
          schoolId: selectedSchoolId,
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear)
        }
      });
      setPreviewData(response.data);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.msg?.includes('already exists')) {
        toast.error('Invoice already exists for this month');
      }
      setPreviewData(null);
    } finally {
      setFetchingPreview(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const response = await api.post('/invoices/generate', {
        schoolId: data.schoolId,
        month: parseInt(data.month),
        year: parseInt(data.year),
        adjustment: parseFloat(data.adjustment)
      });
      toast.success('Invoice generated successfully!');
      navigate(`/invoices/${response.data._id}`);
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-white" />
            <h2 className="text-xl font-semibold text-white">Generate Invoice</h2>
          </div>
        </div>

        <div className="p-6">
          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* School Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select School <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <School className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    {...register('schoolId')}
                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Choose a school</option>
                    {schools.map(school => (
                      <option key={school._id} value={school._id}>
                        {school.name} - {school.city}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.schoolId && (
                  <p className="mt-1 text-sm text-red-600">{errors.schoolId.message}</p>
                )}
              </div>

              {/* Month Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    {...register('month')}
                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Month</option>
                    {months.map((month, index) => (
                      <option key={index} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.month && (
                  <p className="mt-1 text-sm text-red-600">{errors.month.message}</p>
                )}
              </div>

              {/* Year Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('year')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {[currentYear, currentYear - 1, currentYear - 2].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                {errors.year && (
                  <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
                )}
              </div>
            </div>

            {/* Adjustment */}
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adjustment Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  {...register('adjustment', { valueAsNumber: true })}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter adjustment amount"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Positive for extra charges, negative for discount
              </p>
            </div>

            {/* Invoice Preview */}
            {fetchingPreview && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {previewData && !fetchingPreview && (
              <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Preview</h3>
                
                {/* Employees Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Salary</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Leave Deduction</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">TDS</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Final</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.employees?.map((emp, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {emp.employee?.basicInfo?.fullName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            ₹{emp.billingSalary?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            ₹{emp.leaveDeduction?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            ₹{emp.grossAmount?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            ₹{emp.tdsAmount?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            ₹{emp.finalAmount?.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">₹{previewData.subtotal?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">GST (18%):</span>
                        <span className="font-medium">₹{previewData.gstAmount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Current Bill Total:</span>
                        <span className="font-medium">₹{previewData.currentBillTotal?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Previous Due:</span>
                        <span className="font-medium">₹{previewData.previousDue?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Adjustment:</span>
                        <span className="font-medium">₹{previewData.adjustment?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                        <span>Grand Total:</span>
                        <span className="text-indigo-600">₹{previewData.grandTotal?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/invoices')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !previewData}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Generate Invoice
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;