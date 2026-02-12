import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Briefcase,
  Calendar,
  DollarSign,
  Building2,
  Mail,
  Phone,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

const Employees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    status: '',
    employmentType: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, [filters]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      if (filters.employmentType) params.append('employmentType', filters.employmentType);
      
      // Updated API endpoint to match backend route
      const response = await api.get(`/employee/hr/employees?${params.toString()}`);
      setEmployees(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch employees');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        // Note: You need to add this DELETE endpoint in your backend
        await api.delete(`/employee/${id}`);
        toast.success('Employee deleted successfully');
        fetchEmployees();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete employee');
      }
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'bg-green-100 text-green-800',
      'On-Notice': 'bg-yellow-100 text-yellow-800',
      'Resigned': 'bg-red-100 text-red-800',
      'Terminated': 'bg-red-100 text-red-800',
      'Probation': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getEmploymentTypeBadge = (type) => {
    const badges = {
      'Full-Time': 'bg-purple-100 text-purple-800',
      'Part-Time': 'bg-indigo-100 text-indigo-800',
      'Intern': 'bg-cyan-100 text-cyan-800',
      'Contract': 'bg-orange-100 text-orange-800'
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };

  const getWorkModeIcon = (mode) => {
    switch(mode) {
      case 'Onsite': return '🏢';
      case 'Work-from-Home': return '🏠';
      case 'Hybrid': return '🔄';
      default: return '📍';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString('en-IN') || '0'}`;
  };

  const departments = [
    'IT', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'Training'
  ];

  const employmentTypes = ['Full-Time', 'Part-Time', 'Intern', 'Contract'];
  const statuses = ['Active', 'On-Notice', 'Resigned', 'Terminated', 'Probation'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage all employees and their information
          </p>
        </div>
        <Link
          to="/employees/create"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add New Employee
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{employees.length}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {employees.filter(e => e.basicInfo?.employeeStatus === 'Active').length}
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
              <p className="text-sm font-medium text-gray-600">Probation</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {employees.filter(e => e.basicInfo?.employeeStatus === 'Probation').length}
              </p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">On-Notice</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {employees.filter(e => e.basicInfo?.employeeStatus === 'On-Notice').length}
              </p>
            </div>
            <div className="bg-yellow-100 p-2 rounded-lg">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Full-Time</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {employees.filter(e => e.basicInfo?.employmentType === 'Full-Time').length}
              </p>
            </div>
            <div className="bg-purple-100 p-2 rounded-lg">
              <Briefcase className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, employee ID..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={filters.employmentType}
            onChange={(e) => setFilters({ ...filters, employmentType: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            {employmentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setFilters({ search: '', department: '', status: '', employmentType: '' })}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Employees List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gray-100 p-3 rounded-full">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
          <p className="text-gray-500 mb-6">Get started by adding a new employee</p>
          <Link
            to="/employees/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Employee
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header - Desktop */}
          <div className="hidden md:grid md:grid-cols-12 bg-gray-50 px-6 py-3 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Employee</div>
            <div className="col-span-2">Department</div>
            <div className="col-span-2">Contact</div>
            <div className="col-span-2">Employment</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {employees.map((employee) => (
              <div key={employee._id} className="p-4 hover:bg-gray-50 transition-colors">
                {/* Mobile View */}
                <div className="md:hidden">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-lg">
                          {employee.basicInfo?.fullName?.charAt(0) || 'E'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {employee.basicInfo?.fullName || 'N/A'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {employee.basicInfo?.employeeId}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(employee.basicInfo?.employeeStatus)}`}>
                      {employee.basicInfo?.employeeStatus || 'N/A'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Designation</p>
                      <p className="font-medium text-gray-900">{employee.basicInfo?.designation || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Department</p>
                      <p className="font-medium text-gray-900">{employee.basicInfo?.department || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEmploymentTypeBadge(employee.basicInfo?.employmentType)}`}>
                        {employee.basicInfo?.employmentType || 'N/A'}
                      </span>
                      <span className="text-sm text-gray-600">
                        {getWorkModeIcon(employee.basicInfo?.workMode)} {employee.basicInfo?.workMode}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/employees/${employee._id}`}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/employees/edit/${employee._id}`}
                        className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => toggleExpand(employee._id)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                      >
                        {expandedId === employee._id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Mobile Details */}
                  {expandedId === employee._id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <div className="flex items-center mt-1">
                            <Mail className="h-3 w-3 text-gray-400 mr-1" />
                            <p className="text-sm text-gray-900">{employee.user?.email || 'N/A'}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <div className="flex items-center mt-1">
                            <Phone className="h-3 w-3 text-gray-400 mr-1" />
                            <p className="text-sm text-gray-900">{employee.personalDetails?.contactNumber || 'N/A'}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Date of Joining</p>
                          <div className="flex items-center mt-1">
                            <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                            <p className="text-sm text-gray-900">{formatDate(employee.basicInfo?.dateOfJoining)}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Salary</p>
                          <div className="flex items-center mt-1">
                            <DollarSign className="h-3 w-3 text-gray-400 mr-1" />
                            <p className="text-sm font-medium text-gray-900">{formatCurrency(employee.basicInfo?.salary)}</p>
                          </div>
                        </div>
                      </div>
                      
                      {employee.basicInfo?.reportingManager && (
                        <div>
                          <p className="text-xs text-gray-500">Reporting Manager</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {typeof employee.basicInfo.reportingManager === 'object' 
                              ? employee.basicInfo.reportingManager?.name 
                              : 'N/A'}
                          </p>
                        </div>
                      )}

                      <div className="flex space-x-2 pt-2">
                        <button
                          onClick={() => handleDelete(employee._id)}
                          className="flex-1 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop View */}
                <div className="hidden md:grid md:grid-cols-12 items-center">
                  <div className="col-span-3 flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold text-lg">
                        {employee.basicInfo?.fullName?.charAt(0) || 'E'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{employee.basicInfo?.fullName || 'N/A'}</p>
                      <p className="text-xs text-gray-500 mt-1">{employee.basicInfo?.employeeId}</p>
                      <p className="text-xs text-gray-500">{employee.basicInfo?.designation}</p>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-900">{employee.basicInfo?.department || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {employee.basicInfo?.workLocation}
                    </p>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-1 text-gray-400" />
                      <span className="truncate">{employee.user?.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <Phone className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{employee.personalDetails?.contactNumber || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEmploymentTypeBadge(employee.basicInfo?.employmentType)}`}>
                      {employee.basicInfo?.employmentType}
                    </span>
                    <div className="flex items-center text-xs text-gray-500 mt-2">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(employee.basicInfo?.dateOfJoining)}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <span className="mr-1">{getWorkModeIcon(employee.basicInfo?.workMode)}</span>
                      {employee.basicInfo?.workMode}
                    </div>
                  </div>
                  
                  <div className="col-span-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(employee.basicInfo?.employeeStatus)}`}>
                      {employee.basicInfo?.employeeStatus}
                    </span>
                  </div>
                  
                  <div className="col-span-2 flex items-center justify-end space-x-2">
                    <Link
                      to={`/employees/${employee._id}`}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/employees/edit/${employee._id}`}
                      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(employee._id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Total Employees: <span className="font-medium text-gray-900">{employees.length}</span>
                </span>
                <span className="text-sm text-gray-600">
                  Active: <span className="font-medium text-green-600">
                    {employees.filter(e => e.basicInfo?.employeeStatus === 'Active').length}
                  </span>
                </span>
                <span className="text-sm text-gray-600">
                  Full-Time: <span className="font-medium text-purple-600">
                    {employees.filter(e => e.basicInfo?.employmentType === 'Full-Time').length}
                  </span>
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  <Building2 className="h-4 w-4 inline mr-1" />
                  Onsite: {employees.filter(e => e.basicInfo?.workMode === 'Onsite').length}
                </span>
                <span className="text-sm text-gray-600">
                  WFH: {employees.filter(e => e.basicInfo?.workMode === 'Work-from-Home').length}
                </span>
                <span className="text-sm text-gray-600">
                  Hybrid: {employees.filter(e => e.basicInfo?.workMode === 'Hybrid').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;