import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Search, 
  Filter, 
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  Building2,
  User,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

const EmployeePosting = () => {
  const navigate = useNavigate();
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    isActive: 'true'
  });

  useEffect(() => {
    fetchPostings();
  }, [filters.status, filters.isActive]); // Remove search from dependency

  const fetchPostings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.isActive) params.append('isActive', filters.isActive);
      
      // ✅ FIXED: Correct API endpoint
      const response = await api.get(`/employee-postings?${params.toString()}`);
      
      // Client-side search filtering
      let filteredData = response.data.data || [];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(posting => 
          posting.employee?.basicInfo?.fullName?.toLowerCase().includes(searchLower) ||
          posting.employee?.basicInfo?.employeeId?.toLowerCase().includes(searchLower) ||
          posting.school?.name?.toLowerCase().includes(searchLower) ||
          posting.school?.city?.toLowerCase().includes(searchLower)
        );
      }
      
      setPostings(filteredData);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch employee postings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'continue': { color: 'bg-green-100 text-green-800', label: 'Continue' },
      'change_school': { color: 'bg-blue-100 text-blue-800', label: 'Change School' },
      'resign': { color: 'bg-yellow-100 text-yellow-800', label: 'Resigned' },
      'terminate': { color: 'bg-red-100 text-red-800', label: 'Terminated' }
    };
    return badges[status] || { color: 'bg-gray-100 text-gray-800', label: status };
  };

  const formatDate = (date) => {
    if (!date) return 'Present';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString('en-IN') || '0'}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Postings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage employee assignments to schools
          </p>
        </div>
        <button
          onClick={() => navigate('/postings/create')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          New Posting
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Postings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{postings.length}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {postings.filter(p => p.isActive).length}
              </p>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Continue</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {postings.filter(p => p.status === 'continue').length}
              </p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <RefreshCw className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Billing</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {formatCurrency(postings.reduce((sum, p) => sum + (p.monthlyBillingSalary || 0), 0))}
              </p>
            </div>
            <div className="bg-purple-100 p-2 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee name, ID or school..."
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                fetchPostings(); // Re-fetch with search
              }}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="continue">Continue</option>
              <option value="change_school">Change School</option>
              <option value="resign">Resigned</option>
              <option value="terminate">Terminated</option>
            </select>
          </div>

          {/* Active Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filters.isActive}
              onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="true">Active Postings</option>
              <option value="false">Inactive Postings</option>
              <option value="">All Postings</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchPostings}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center justify-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
        
        {/* Active Filters Display */}
        {(filters.search || filters.status || filters.isActive !== 'true') && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">Active Filters:</span>
            {filters.search && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700">
                Search: {filters.search}
                <button 
                  onClick={() => setFilters({ ...filters, search: '' })}
                  className="ml-1 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700">
                Status: {filters.status}
                <button 
                  onClick={() => setFilters({ ...filters, status: '' })}
                  className="ml-1 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}
            {filters.isActive !== 'true' && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700">
                {filters.isActive === 'false' ? 'Inactive' : 'All'} 
                <button 
                  onClick={() => setFilters({ ...filters, isActive: 'true' })}
                  className="ml-1 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => setFilters({ search: '', status: '', isActive: 'true' })}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Postings List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : postings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gray-100 p-3 rounded-full">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No postings found</h3>
          <p className="text-gray-500 mb-6">Get started by creating a new employee posting</p>
          <button
            onClick={() => navigate('/postings/create')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Posting
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {postings.map((posting) => {
            const statusBadge = getStatusBadge(posting.status);
            
            return (
              <div
                key={posting._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                  {/* Left Section - Employee Info */}
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      {/* Employee Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-lg">
                            {posting.employee?.basicInfo?.fullName?.charAt(0) || 'E'}
                          </span>
                        </div>
                      </div>

                      {/* Employee Details */}
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {posting.employee?.basicInfo?.fullName || 'N/A'}
                          </h3>
                          <span className="text-sm text-gray-500">
                            ({posting.employee?.basicInfo?.employeeId || 'No ID'})
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                          {posting.isActive ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 flex items-center">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mt-1">
                          {posting.employee?.basicInfo?.designation || 'Designation N/A'} • {posting.employee?.basicInfo?.department || 'Department N/A'}
                        </p>

                        {/* School Info */}
                        <div className="mt-3 flex items-center text-sm text-gray-600">
                          <Building2 className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="font-medium">{posting.school?.name || 'N/A'}</span>
                          <span className="mx-2">•</span>
                          <span>{posting.school?.city || 'N/A'}</span>
                          {posting.school?.address && (
                            <span className="ml-2 text-xs text-gray-400">
                              ({posting.school.address.substring(0, 30)}...)
                            </span>
                          )}
                        </div>

                        {/* Date Range */}
                        <div className="mt-2 flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          <span>{formatDate(posting.startDate)} - {formatDate(posting.endDate)}</span>
                          {posting.endDate && (
                            <span className="ml-2 text-xs text-gray-400">
                              ({Math.ceil((new Date(posting.endDate) - new Date(posting.startDate)) / (1000 * 60 * 60 * 24))} days)
                            </span>
                          )}
                        </div>

                        {/* Salary & Billing */}
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div className="flex items-center text-sm">
                            <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-gray-600">Billing:</span>
                            <span className="ml-1 font-medium text-gray-900">
                              {formatCurrency(posting.monthlyBillingSalary)}
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <span className="text-gray-600">TDS:</span>
                            <span className="ml-1 font-medium text-gray-900">
                              {posting.tdsPercent || 0}%
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <span className="text-gray-600">GST:</span>
                            <span className="ml-1 font-medium text-gray-900">
                              {posting.gstPercent || 0}%
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <span className="text-gray-600">Net:</span>
                            <span className="ml-1 font-medium text-green-600">
                              {formatCurrency(posting.monthlyBillingSalary * (1 - (posting.tdsPercent || 0)/100))}
                            </span>
                          </div>
                        </div>

                        {/* Remark */}
                        {posting.remark && (
                          <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-md border-l-4 border-blue-500">
                            <span className="font-medium">Remark:</span> {posting.remark}
                          </div>
                        )}

                        {/* Created/Updated Info */}
                        <div className="mt-3 text-xs text-gray-500 flex items-center gap-3">
                          <span>Created by {posting.createdBy?.name || 'N/A'} on {formatDate(posting.createdAt)}</span>
                          {posting.updatedBy && (
                            <span>• Updated by {posting.updatedBy.name} on {formatDate(posting.updatedAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="mt-4 lg:mt-0 lg:ml-6 flex lg:flex-col items-start lg:items-end gap-2">
                    <button
                      onClick={() => navigate(`/postings/${posting._id}`)}
                      className="inline-flex items-center px-3 py-2 text-sm text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                    {posting.isActive && (
                      <button
                        onClick={() => {
                          // Handle end posting
                          if (window.confirm('Are you sure you want to end this posting?')) {
                            // Add end posting logic here
                            toast.success('Posting ended successfully');
                          }
                        }}
                        className="inline-flex items-center px-3 py-2 text-sm text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        End Posting
                      </button>
                    )}
                  </div>
                </div>

                {/* Salary History */}
                {posting.salaryHistory && posting.salaryHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <details className="text-sm">
                      <summary className="text-blue-600 cursor-pointer hover:text-blue-800 font-medium">
                        View Salary History ({posting.salaryHistory.length} changes)
                      </summary>
                      <div className="mt-3 space-y-2">
                        {posting.salaryHistory.map((history, index) => (
                          <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded-md">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                              <span className="font-medium text-gray-900">{formatCurrency(history.amount)}</span>
                            </div>
                            <span className="text-gray-600">
                              {formatDate(history.from)} - {history.to ? formatDate(history.to) : 'Present'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            );
          })}

          {/* Summary Footer */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center">
                <UserPlus className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-900">
                  Total Postings: {postings.length}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-blue-700">
                  <span className="font-medium">Active:</span> {postings.filter(p => p.isActive).length}
                </span>
                <span className="text-sm text-blue-700">
                  <span className="font-medium">Continue:</span> {postings.filter(p => p.status === 'continue').length}
                </span>
                <span className="text-sm text-blue-700">
                  <span className="font-medium">Change School:</span> {postings.filter(p => p.status === 'change_school').length}
                </span>
                <span className="text-sm text-blue-700">
                  <span className="font-medium">Resigned:</span> {postings.filter(p => p.status === 'resign').length}
                </span>
                <span className="text-sm text-blue-700">
                  <span className="font-medium">Terminated:</span> {postings.filter(p => p.status === 'terminate').length}
                </span>
              </div>
              <div className="text-sm font-medium text-blue-900">
                Total Monthly Billing: {formatCurrency(postings.reduce((sum, p) => sum + (p.monthlyBillingSalary || 0), 0))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePosting;