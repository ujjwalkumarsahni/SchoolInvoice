// pages/EmployeePostings/PostingAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CurrencyRupeeIcon,
  ArrowLeftIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { getPostingAnalytics } from '../../services/api.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import Button from '../../components/Common/Button.jsx';
import toast from 'react-hot-toast';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

const PostingAnalytics = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await getPostingAnalytics();
      
      let analyticsData = null;
      if (response.data) {
        if (response.data.data) {
          analyticsData = response.data.data;
        } else {
          analyticsData = response.data;
        }
      }
      
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statusData = analytics?.statusCounts ? Object.entries(analytics.statusCounts).map(([status, data]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
    total: data.total,
    active: data.active,
    inactive: data.inactive
  })) : [];

  const schoolStatusData = analytics?.schoolStats?.map(school => ({
    name: school.name.length > 20 ? school.name.substring(0, 20) + '...' : school.name,
    required: school.trainersRequired,
    current: school.currentCount,
    shortage: school.shortage,
    status: school.status
  })) || [];

  const pieData = schoolStatusData.map(school => ({
    name: school.name,
    value: school.shortage
  })).filter(d => d.value > 0);

  // Calculate totals
  const totalPostings = statusData.reduce((sum, s) => sum + s.total, 0);
  const activePostings = statusData.reduce((sum, s) => sum + s.active, 0);
  const schoolsWithShortage = schoolStatusData.filter(s => s.status === 'shortage' || s.status === 'critical').length;
  const totalShortage = schoolStatusData.reduce((sum, s) => sum + s.shortage, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/postings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Posting Analytics</h1>
          <p className="text-gray-500 mt-1">Overview of all employee postings and school requirements</p>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTimeRange('week')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            timeRange === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            timeRange === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Month
        </button>
        <button
          onClick={() => setTimeRange('quarter')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            timeRange === 'quarter' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Quarter
        </button>
        <button
          onClick={() => setTimeRange('year')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            timeRange === 'year' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Year
        </button>
      </div>

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
          <p className="text-sm text-gray-600">Active Postings</p>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4">
          <BuildingOfficeIcon className="w-6 h-6 text-yellow-600 mb-2" />
          <p className="text-2xl font-semibold">{schoolsWithShortage}</p>
          <p className="text-sm text-gray-600">Schools with Shortage</p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <UserGroupIcon className="w-6 h-6 text-purple-600 mb-2" />
          <p className="text-2xl font-semibold">{totalShortage}</p>
          <p className="text-sm text-gray-600">Total Shortage</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Posting Status Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="active" fill="#10b981" name="Active" />
                <Bar dataKey="inactive" fill="#ef4444" name="Inactive" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* School Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">School Trainer Status</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={schoolStatusData.slice(0, 10)} margin={{ bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="required" fill="#f59e0b" name="Required" />
                <Bar dataKey="current" fill="#10b981" name="Current" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Shortage Pie Chart */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4">Trainer Shortage Distribution</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* School Status Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">School Status Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shortage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {schoolStatusData.map((school, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {school.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {school.required}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {school.current}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={school.shortage > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                      {school.shortage}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      school.status === 'adequate' ? 'bg-green-100 text-green-800' :
                      school.status === 'shortage' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {school.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            (school.current / school.required) >= 1 ? 'bg-green-500' :
                            (school.current / school.required) >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min((school.current / school.required) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round((school.current / school.required) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PostingAnalytics;