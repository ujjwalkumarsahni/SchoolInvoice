// pages/Schools/SchoolList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { getSchools } from '../../services/api.js';
import Button from '../../components/Common/Button.jsx';
import Badge from '../../components/Common/Badge.jsx';
import Table from '../../components/Common/Table.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext.jsx';

const SchoolList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    city: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filteredSchools, setFilteredSchools] = useState([]);

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, schools]);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const response = await getSchools();
      console.log('Schools response:', response);
      
      let schoolsData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          schoolsData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          schoolsData = response.data.data;
        } else if (response.data.schools && Array.isArray(response.data.schools)) {
          schoolsData = response.data.schools;
        }
      }
      
      setSchools(schoolsData);
      setFilteredSchools(schoolsData);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
      toast.error('Failed to fetch schools');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    let filtered = [...schools];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(school => 
        school.name?.toLowerCase().includes(searchLower) ||
        school.email?.toLowerCase().includes(searchLower) ||
        school.contactPersonName?.toLowerCase().includes(searchLower)
      );
    }

    // City filter
    if (filters.city) {
      filtered = filtered.filter(school => school.city === filters.city);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(school => school.status === filters.status);
    }

    setFilteredSchools(filtered);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      city: '',
      status: ''
    });
    setFilteredSchools(schools);
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  };

  const getTrainerStatusColor = (status) => {
    const colors = {
      'adequate': 'bg-green-100 text-green-800',
      'shortage': 'bg-yellow-100 text-yellow-800',
      'critical': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const columns = [
    {
      key: 'school',
      header: 'School',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="flex items-center text-sm text-gray-500">
              <MapPinIcon className="w-4 h-4 mr-1" />
              {row.city}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (row) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
            {row.contactPersonName}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
            {row.mobile}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      cell: (row) => (
        <div className="flex items-center text-sm">
          <EnvelopeIcon className="w-4 h-4 mr-2 text-gray-400" />
          {row.email}
        </div>
      ),
    },
    {
      key: 'trainers',
      header: 'Trainers',
      cell: (row) => (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserGroupIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{row.currentTrainers?.length || 0}</span>
            <span className="text-gray-400">/</span>
            <span className="font-medium text-blue-600">{row.trainersRequired}</span>
          </div>
          <Badge className={getTrainerStatusColor(row.trainerStatus)}>
            {row.trainerStatus}
          </Badge>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge className={getStatusColor(row.status)}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      cell: (row) => (
        <div className="text-sm">
          <div>{format(new Date(row.createdAt), 'dd MMM yyyy')}</div>
          <div className="text-gray-500 text-xs">by {row.createdBy?.name?.split(' ')[0] || 'N/A'}</div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/schools/${row._id}`)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <ArrowTopRightOnSquareIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate(`/schools/edit/${row._id}`)}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  const cities = [...new Set(schools.map(school => school.city).filter(Boolean))];
  const canManage = ['admin', 'superadmin', 'hr'].includes(user?.role);

  // Calculate stats
  const totalSchools = schools.length;
  const activeSchools = schools.filter(s => s.status === 'active').length;
  const totalTrainers = schools.reduce((acc, s) => acc + (s.currentTrainers?.length || 0), 0);
  const trainersRequired = schools.reduce((acc, s) => acc + s.trainersRequired, 0);
  const shortageSchools = schools.filter(s => s.trainerStatus === 'shortage' || s.trainerStatus === 'critical').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header with prominent Add School button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Schools</h1>
          <p className="text-gray-500 mt-1">Manage all schools and their details</p>
        </div>
        
        {/* Action Buttons Group */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
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
            onClick={fetchSchools}
            icon={ArrowPathIcon}
          >
            Refresh
          </Button>
          
          {/* Add School Button - Always Visible */}
          {canManage && (
            <Button
              variant="primary"
              onClick={() => navigate('/schools/new')}
              icon={PlusIcon}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all"
            >
              Add New School
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search schools by name, email, or contact person..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Simple Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <select
                value={filters.city}
                onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Cities</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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

      {/* Simple Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <BuildingOfficeIcon className="w-6 h-6 text-blue-600 mb-2" />
          <p className="text-2xl font-semibold">{totalSchools}</p>
          <p className="text-sm text-gray-600">Total Schools</p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <CheckCircleIcon className="w-6 h-6 text-green-600 mb-2" />
          <p className="text-2xl font-semibold">{activeSchools}</p>
          <p className="text-sm text-gray-600">Active Schools</p>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4">
          <UserGroupIcon className="w-6 h-6 text-yellow-600 mb-2" />
          <p className="text-2xl font-semibold">{totalTrainers}</p>
          <p className="text-sm text-gray-600">Total Trainers</p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <UserGroupIcon className="w-6 h-6 text-purple-600 mb-2" />
          <p className="text-2xl font-semibold">{trainersRequired}</p>
          <p className="text-sm text-gray-600">Trainers Needed</p>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Schools List</h2>
            <span className="text-sm text-gray-600">
              {filteredSchools.length} of {schools.length} schools
            </span>
          </div>
        </div>
        
        <Table columns={columns} data={filteredSchools} loading={loading} />
        
        {filteredSchools.length === 0 && !loading && (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No schools found</h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.city || filters.status 
                ? "No schools match your filters. Try adjusting them."
                : "Get started by adding your first school."}
            </p>
            {canManage && (
              <Button
                variant="primary"
                onClick={() => navigate('/schools/new')}
                icon={PlusIcon}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                Add Your First School
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Floating Action Button - Only shows on mobile */}
      {canManage && (
        <div className="fixed bottom-6 right-6 md:hidden z-50">
          <button
            onClick={() => navigate('/schools/new')}
            className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
            title="Add New School"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SchoolList;