import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  MapPin, 
  Users, 
  AlertCircle,
  Mail,
  Phone,
  Building2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

const Schools = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchSchools();
  }, [search, statusFilter, cityFilter]);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (cityFilter) params.append('city', cityFilter);
      
      const response = await api.get(`/schools?${params.toString()}`);
      setSchools(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch schools');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this school?')) {
      try {
        await api.delete(`/schools/${id}`);
        toast.success('School deleted successfully');
        fetchSchools();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete school');
      }
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getTrainerStatusBadge = (status) => {
    const badges = {
      adequate: 'bg-green-100 text-green-800',
      shortage: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schools Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage all schools and their trainer requirements
          </p>
        </div>
        <Link
          to="/schools/create"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add New School
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, contact person, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setCityFilter('');
            }}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Schools List - Table View */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : schools.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gray-100 p-3 rounded-full">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No schools found</h3>
          <p className="text-gray-500 mb-6">Get started by creating a new school</p>
          <Link
            to="/schools/create"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New School
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-12 bg-gray-50 px-6 py-3 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">School Name</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-2">Contact Person</div>
            <div className="col-span-2">Trainers</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {schools.map((school) => (
              <div key={school._id} className="p-4 hover:bg-gray-50 transition-colors">
                {/* Mobile View */}
                <div className="md:hidden">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {school.logo?.url ? (
                        <img
                          src={school.logo.url}
                          alt={school.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center">
                          <span className="text-indigo-600 font-bold text-lg">
                            {school.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900">{school.name}</h3>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {school.city}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(school.status)}`}>
                      {school.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Contact</p>
                      <p className="font-medium text-gray-900">{school.contactPersonName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Mobile</p>
                      <p className="font-medium text-gray-900">{school.mobile}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {school.trainersCount}/{school.trainersRequired}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTrainerStatusBadge(school.trainerStatus)}`}>
                        {school.trainerStatus}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/schools/${school._id}`}
                        className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/schools/edit/${school._id}`}
                        className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(school._id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleExpand(school._id)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                      >
                        {expandedId === school._id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Mobile Details */}
                  {expandedId === school._id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm text-gray-900">{school.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="text-sm text-gray-900">{school.address}</p>
                      </div>
                      {school.trainerRequirementStatus?.needed > 0 && (
                        <div className="bg-amber-50 p-2 rounded-lg">
                          <p className="text-xs text-amber-800 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Need {school.trainerRequirementStatus.needed} more trainer(s)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Desktop View */}
                <div className="hidden md:grid md:grid-cols-12 items-center">
                  <div className="col-span-3 flex items-center space-x-3">
                    {school.logo?.url ? (
                      <img
                        src={school.logo.url}
                        alt={school.name}
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center">
                        <span className="text-indigo-600 font-bold text-sm">
                          {school.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{school.name}</p>
                      <p className="text-xs text-gray-500">{school.email}</p>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      {school.city}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{school.address?.substring(0, 30)}...</p>
                  </div>
                  
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-900">{school.contactPersonName}</p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Phone className="h-3 w-3 mr-1" />
                      {school.mobile}
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {school.trainersCount}/{school.trainersRequired}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTrainerStatusBadge(school.trainerStatus)}`}>
                        {school.trainerStatus}
                      </span>
                    </div>
                    {school.trainerRequirementStatus?.needed > 0 && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Need {school.trainerRequirementStatus.needed} more
                      </p>
                    )}
                  </div>
                  
                  <div className="col-span-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(school.status)}`}>
                      {school.status}
                    </span>
                  </div>
                  
                  <div className="col-span-2 flex items-center justify-end space-x-2">
                    <Link
                      to={`/schools/${school._id}`}
                      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/schools/edit/${school._id}`}
                      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(school._id)}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Total Schools: <span className="font-medium text-gray-900">{schools.length}</span>
                </span>
                <span className="text-sm text-gray-600">
                  Active: <span className="font-medium text-green-600">
                    {schools.filter(s => s.status === 'active').length}
                  </span>
                </span>
                <span className="text-sm text-gray-600">
                  Inactive: <span className="font-medium text-red-600">
                    {schools.filter(s => s.status === 'inactive').length}
                  </span>
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Total Trainers Required: <span className="font-medium text-gray-900">
                    {schools.reduce((acc, s) => acc + (s.trainersRequired || 0), 0)}
                  </span>
                </span>
                <span className="text-sm text-gray-600">
                  Current Trainers: <span className="font-medium text-gray-900">
                    {schools.reduce((acc, s) => acc + (s.trainersCount || 0), 0)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schools;