// pages/Employees/EmployeeList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  UserIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
  EnvelopeIcon,
  PhoneIcon,
  ArrowTopRightOnSquareIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { getEmployees } from '../../services/api.js';
import Button from '../../components/Common/Button.jsx';
import Badge from '../../components/Common/Badge.jsx';
import Table from '../../components/Common/Table.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext.jsx';

const EmployeeList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    status: '',
    employmentType: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, employees]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await getEmployees();
      console.log('Employees response:', response);
      
      let employeesData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          employeesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          employeesData = response.data.data;
        } else if (response.data.employees && Array.isArray(response.data.employees)) {
          employeesData = response.data.employees;
        }
      }
      
      setEmployees(employeesData);
      setFilteredEmployees(employeesData);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    let filtered = [...employees];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.basicInfo?.fullName?.toLowerCase().includes(searchLower) ||
        emp.basicInfo?.employeeId?.toLowerCase().includes(searchLower) ||
        emp.basicInfo?.designation?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.department) {
      filtered = filtered.filter(emp => emp.basicInfo?.department === filters.department);
    }

    if (filters.status) {
      filtered = filtered.filter(emp => emp.basicInfo?.employeeStatus === filters.status);
    }

    if (filters.employmentType) {
      filtered = filtered.filter(emp => emp.basicInfo?.employmentType === filters.employmentType);
    }

    setFilteredEmployees(filtered);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      department: '',
      status: '',
      employmentType: ''
    });
    setFilteredEmployees(employees);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'bg-green-100 text-green-800 border border-green-200',
      'On-Notice': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'Resigned': 'bg-gray-100 text-gray-800 border border-gray-200',
      'Terminated': 'bg-red-100 text-red-800 border border-red-200',
      'Probation': 'bg-blue-100 text-blue-800 border border-blue-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Active':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'On-Notice':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'Resigned':
      case 'Terminated':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'Probation':
        return <ClockIcon className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-medium">
              {row.basicInfo?.fullName?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.basicInfo?.fullName}</div>
            <div className="text-xs text-gray-500">ID: {row.basicInfo?.employeeId}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'designation',
      header: 'Designation',
      cell: (row) => (
        <div>
          <div className="text-sm font-medium">{row.basicInfo?.designation}</div>
          <div className="text-xs text-gray-500">{row.basicInfo?.department}</div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (row) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
            {row.personalDetails?.contactNumber || 'N/A'}
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <EnvelopeIcon className="w-4 h-4 mr-2 text-gray-400" />
            {row.personalDetails?.personalEmail || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      key: 'employment',
      header: 'Employment',
      cell: (row) => (
        <div>
          <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
            {row.basicInfo?.employmentType}
          </Badge>
          <div className="text-xs text-gray-500 mt-1">{row.basicInfo?.workMode}</div>
        </div>
      ),
    },
    {
      key: 'dateOfJoining',
      header: 'Joined',
      cell: (row) => (
        <div>
          <div className="text-sm">
            {row.basicInfo?.dateOfJoining ? format(new Date(row.basicInfo.dateOfJoining), 'dd MMM yyyy') : 'N/A'}
          </div>
          <div className="text-xs text-gray-500">
            {row.basicInfo?.dateOfJoining ? 
              `${Math.floor((new Date() - new Date(row.basicInfo.dateOfJoining)) / (1000 * 60 * 60 * 24 * 30))} months` : 
              ''}
          </div>
        </div>
      ),
    },
    {
      key: 'salary',
      header: 'Salary',
      cell: (row) => (
        <div>
          <div className="text-sm font-semibold text-blue-600">
            ₹{(row.basicInfo?.salary || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">per month</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(row.basicInfo?.employeeStatus)}
          <Badge className={getStatusColor(row.basicInfo?.employeeStatus)}>
            {row.basicInfo?.employeeStatus}
          </Badge>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/employees/${row._id}`)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <ArrowTopRightOnSquareIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate(`/employees/edit/${row._id}`)}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  const departments = [...new Set(employees.map(emp => emp.basicInfo?.department).filter(Boolean))];
  const employmentTypes = [...new Set(employees.map(emp => emp.basicInfo?.employmentType).filter(Boolean))];
  const canManage = ['admin', 'superadmin', 'hr'].includes(user?.role);

  // Calculate stats
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => emp.basicInfo?.employeeStatus === 'Active').length;
  const onNoticeEmployees = employees.filter(emp => emp.basicInfo?.employeeStatus === 'On-Notice').length;
  const probationEmployees = employees.filter(emp => emp.basicInfo?.employeeStatus === 'Probation').length;

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
          <p className="text-gray-500 mt-1">Manage all employees and their details</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            icon={FunnelIcon}
            className={showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}
          >
            Filters
            {Object.values(filters).some(v => v) && (
              <span className="ml-2 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {Object.values(filters).filter(v => v).length}
              </span>
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={fetchEmployees}
            icon={ArrowPathIcon}
          >
            Refresh
          </Button>
          {canManage && (
            <Button
              variant="primary"
              onClick={() => navigate('/employees/new')}
              icon={PlusIcon}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search employees by name, ID, or designation..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                name="department"
                value={filters.department}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="On-Notice">On Notice</option>
                <option value="Probation">Probation</option>
                <option value="Resigned">Resigned</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
              <select
                name="employmentType"
                value={filters.employmentType}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {employmentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button variant="primary" onClick={applyFilters} className="flex-1">
                Apply
              </Button>
              <Button variant="secondary" onClick={resetFilters} className="flex-1">
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <UserIcon className="w-6 h-6 text-blue-600 mb-2" />
          <p className="text-2xl font-semibold">{totalEmployees}</p>
          <p className="text-sm text-gray-600">Total Employees</p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <CheckCircleIcon className="w-6 h-6 text-green-600 mb-2" />
          <p className="text-2xl font-semibold">{activeEmployees}</p>
          <p className="text-sm text-gray-600">Active</p>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4">
          <ClockIcon className="w-6 h-6 text-yellow-600 mb-2" />
          <p className="text-2xl font-semibold">{onNoticeEmployees}</p>
          <p className="text-sm text-gray-600">On Notice</p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <BriefcaseIcon className="w-6 h-6 text-purple-600 mb-2" />
          <p className="text-2xl font-semibold">{probationEmployees}</p>
          <p className="text-sm text-gray-600">On Probation</p>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Employees Directory</h2>
            <span className="text-sm text-gray-600">
              {filteredEmployees.length} of {employees.length} employees
            </span>
          </div>
        </div>
        
        <Table columns={columns} data={filteredEmployees} loading={loading} />
        
        {filteredEmployees.length === 0 && !loading && (
          <div className="text-center py-12">
            <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No employees found</h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.department || filters.status || filters.employmentType
                ? "No employees match your filters. Try adjusting them."
                : "Get started by adding your first employee."}
            </p>
            {canManage && (
              <Button
                variant="primary"
                onClick={() => navigate('/employees/new')}
                icon={PlusIcon}
              >
                Add Employee
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {canManage && (
        <div className="fixed bottom-6 right-6 md:hidden z-50">
          <button
            onClick={() => navigate('/employees/new')}
            className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;