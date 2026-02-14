// pages/EmployeePostings/EmployeePostings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  BuildingOfficeIcon,
  UserIcon,
  CurrencyRupeeIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  BriefcaseIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { getPostings } from '../../services/api.js';
import Button from '../../components/Common/Button.jsx';
import Badge from '../../components/Common/Badge.jsx';
import Table from '../../components/Common/Table.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext.jsx';

const EmployeePostings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    school: '',
    employee: '',
    isActive: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filteredPostings, setFilteredPostings] = useState([]);

  useEffect(() => {
    fetchPostings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, postings]);

  const fetchPostings = async () => {
    setLoading(true);
    try {
      const response = await getPostings();
      console.log('Postings response:', response);
      
      let postingsData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          postingsData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          postingsData = response.data.data;
        } else if (response.data.postings && Array.isArray(response.data.postings)) {
          postingsData = response.data.postings;
        }
      }
      
      setPostings(postingsData);
      setFilteredPostings(postingsData);
    } catch (error) {
      console.error('Failed to fetch postings:', error);
      toast.error('Failed to fetch postings');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    let filtered = [...postings];

    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    if (filters.isActive) {
      const isActiveBool = filters.isActive === 'true';
      filtered = filtered.filter(p => p.isActive === isActiveBool);
    }

    if (filters.employee) {
      const searchLower = filters.employee.toLowerCase();
      filtered = filtered.filter(p => 
        p.employee?.basicInfo?.fullName?.toLowerCase().includes(searchLower) ||
        p.employee?.basicInfo?.employeeId?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.school) {
      const searchLower = filters.school.toLowerCase();
      filtered = filtered.filter(p => 
        p.school?.name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredPostings(filtered);
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      school: '',
      employee: '',
      isActive: ''
    });
    setFilteredPostings(postings);
  };

  const getStatusBadge = (status, isActive) => {
    if (!isActive) {
      return <Badge className="bg-gray-100 text-gray-800 border border-gray-200">Inactive</Badge>;
    }
    
    const colors = {
      'continue': 'bg-green-100 text-green-800 border border-green-200',
      'change_school': 'bg-blue-100 text-blue-800 border border-blue-200',
      'resign': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'terminate': 'bg-red-100 text-red-800 border border-red-200'
    };
    
    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800 border border-gray-200'}>
        {status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  const getStatusIcon = (status, isActive) => {
    if (!isActive) return <XCircleIcon className="h-4 w-4 text-gray-400" />;
    
    switch (status) {
      case 'continue':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'change_school':
        return <ArrowTopRightOnSquareIcon className="h-4 w-4 text-blue-500" />;
      case 'resign':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'terminate':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
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
              {row.employee?.basicInfo?.fullName?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {row.employee?.basicInfo?.fullName || 'N/A'}
            </div>
            <div className="text-xs text-gray-500">
              ID: {row.employee?.basicInfo?.employeeId || 'N/A'} • {row.employee?.basicInfo?.designation || 'N/A'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'school',
      header: 'School',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
          <div>
            <div className="text-sm font-medium">{row.school?.name || 'N/A'}</div>
            <div className="text-xs text-gray-500">{row.school?.city || ''}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'billing',
      header: 'Billing Rate',
      cell: (row) => (
        <div>
          <div className="text-sm font-semibold text-blue-600">
            ₹{(row.monthlyBillingSalary || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">per month</div>
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Duration',
      cell: (row) => (
        <div>
          <div className="flex items-center text-xs">
            <CalendarIcon className="h-3 w-3 mr-1 text-gray-400" />
            {row.startDate ? format(new Date(row.startDate), 'dd MMM yyyy') : 'N/A'}
          </div>
          {row.endDate ? (
            <div className="flex items-center text-xs mt-1">
              <CalendarIcon className="h-3 w-3 mr-1 text-gray-400" />
              to {format(new Date(row.endDate), 'dd MMM yyyy')}
            </div>
          ) : (
            <span className="text-xs text-green-600 ml-4">• Present</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(row.status, row.isActive)}
          {getStatusBadge(row.status, row.isActive)}
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      cell: (row) => (
        <div>
          <div className="text-sm">{row.createdBy?.name || 'N/A'}</div>
          <div className="text-xs text-gray-500">
            {row.createdAt ? format(new Date(row.createdAt), 'dd MMM yyyy') : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <button
          onClick={() => navigate(`/postings/${row._id}`)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="View Details"
        >
          <ArrowTopRightOnSquareIcon className="h-5 w-5" />
        </button>
      ),
    },
  ];

  const canManage = ['admin', 'superadmin', 'hr'].includes(user?.role);

  // Calculate stats
  const totalPostings = postings.length;
  const activePostings = postings.filter(p => p.isActive).length;
  const totalBilling = postings
    .filter(p => p.isActive)
    .reduce((sum, p) => sum + (p.monthlyBillingSalary || 0), 0);
  const activeSchools = new Set(postings.filter(p => p.isActive).map(p => p.school?._id).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Employee Postings</h1>
          <p className="text-gray-500 mt-1">Manage employee assignments to schools</p>
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
            onClick={fetchPostings}
            icon={ArrowPathIcon}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/postings/analytics')}
            icon={ChartBarIcon}
          >
            Analytics
          </Button>
          {canManage && (
            <Button
              variant="primary"
              onClick={() => navigate('/postings/new')}
              icon={PlusIcon}
              className="bg-blue-600 hover:bg-blue-700"
            >
              New Posting
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by employee name, ID, or school..."
          value={filters.employee}
          onChange={(e) => setFilters(prev => ({ ...prev, employee: e.target.value }))}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="continue">Continue</option>
                <option value="change_school">Change School</option>
                <option value="resign">Resign</option>
                <option value="terminate">Terminate</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Active Status</label>
              <select
                name="isActive"
                value={filters.isActive}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
              <input
                type="text"
                name="school"
                value={filters.school}
                onChange={handleFilterChange}
                placeholder="School name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
          <BriefcaseIcon className="w-6 h-6 text-blue-600 mb-2" />
          <p className="text-2xl font-semibold">{totalPostings}</p>
          <p className="text-sm text-gray-600">Total Postings</p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <CheckCircleIcon className="w-6 h-6 text-green-600 mb-2" />
          <p className="text-2xl font-semibold">{activePostings}</p>
          <p className="text-sm text-gray-600">Active</p>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4">
          <CurrencyRupeeIcon className="w-6 h-6 text-yellow-600 mb-2" />
          <p className="text-2xl font-semibold">₹{totalBilling.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Monthly Billing</p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <BuildingOfficeIcon className="w-6 h-6 text-purple-600 mb-2" />
          <p className="text-2xl font-semibold">{activeSchools}</p>
          <p className="text-sm text-gray-600">Active Schools</p>
        </div>
      </div>

      {/* Postings Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Postings List</h2>
            <span className="text-sm text-gray-600">
              {filteredPostings.length} of {postings.length} postings
            </span>
          </div>
        </div>
        
        <Table columns={columns} data={filteredPostings} loading={loading} />
        
        {filteredPostings.length === 0 && !loading && (
          <div className="text-center py-12">
            <BriefcaseIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No postings found</h3>
            <p className="text-gray-500 mb-4">
              {filters.status || filters.isActive || filters.employee || filters.school
                ? "No postings match your filters. Try adjusting them."
                : "Get started by creating a new employee posting."}
            </p>
            {canManage && (
              <Button
                variant="primary"
                onClick={() => navigate('/postings/new')}
                icon={PlusIcon}
              >
                Create Posting
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {canManage && (
        <div className="fixed bottom-6 right-6 md:hidden z-50">
          <button
            onClick={() => navigate('/postings/new')}
            className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default EmployeePostings;