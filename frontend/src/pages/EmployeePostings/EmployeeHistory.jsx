// pages/EmployeePostings/EmployeeHistory.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyRupeeIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import { getEmployeePostingHistory } from '../../services/api.js';
import Button from '../../components/Common/Button.jsx';
import Badge from '../../components/Common/Badge.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const EmployeeHistory = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [employeeId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await getEmployeePostingHistory(employeeId);
      
      let historyData = null;
      if (response.data) {
        if (response.data.data) {
          historyData = response.data.data;
        } else {
          historyData = response.data;
        }
      }
      
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to fetch history:', error);
      toast.error('Failed to fetch employee history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'continue':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'change_school':
        return <BuildingOfficeIcon className="w-5 h-5 text-blue-500" />;
      case 'resign':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'terminate':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <CalendarIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      'continue': 'bg-green-100 text-green-800 border border-green-200',
      'change_school': 'bg-blue-100 text-blue-800 border border-blue-200',
      'resign': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'terminate': 'bg-red-100 text-red-800 border border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="text-center py-12">
        <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">History not found</h3>
        <Button
          variant="primary"
          onClick={() => navigate('/postings')}
          icon={ArrowLeftIcon}
        >
          Back to Postings
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {history.employee?.name}'s Posting History
          </h1>
          <p className="text-gray-500 mt-1">
            Employee ID: {history.employee?.employeeId}
          </p>
        </div>
      </div>

      {/* Current Posting */}
      {history.current && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-green-800">Current Posting</h3>
            <Badge className="bg-green-500 text-white px-3 py-1">
              Active
            </Badge>
          </div>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">
                <BuildingOfficeIcon className="w-6 h-6 text-green-700" />
              </div>
              <div>
                <p className="font-medium text-green-900 text-lg">{history.current.school?.name}</p>
                <p className="text-green-700">
                  Since {format(new Date(history.current.startDate), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-green-700">Billing Rate</p>
                <p className="text-xl font-bold text-green-800">
                  ₹{(history.current.monthlyBillingSalary || 0).toLocaleString()}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => navigate(`/postings/${history.current._id}`)}
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                View Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Posting Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Posting Timeline</h3>
        
        {history.history?.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No posting history available</p>
        ) : (
          <div className="space-y-4">
            {history.history?.map((posting, index) => (
              <div key={posting._id} className="relative pl-8 pb-4 last:pb-0">
                {/* Timeline Line */}
                {index < history.history.length - 1 && (
                  <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gray-200"></div>
                )}
                
                {/* Timeline Node */}
                <div className="absolute left-0 top-1">
                  {getStatusIcon(posting.status)}
                </div>
                
                {/* Content */}
                <div className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                        <h4 className="font-medium text-gray-900">{posting.school?.name}</h4>
                        <Badge className={getStatusBadge(posting.status)}>
                          {posting.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-gray-500">Period</p>
                          <p className="font-medium">
                            {format(new Date(posting.startDate), 'dd MMM yyyy')} - 
                            {posting.endDate ? format(new Date(posting.endDate), 'dd MMM yyyy') : 'Present'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Billing Rate</p>
                          <p className="font-medium text-blue-600">
                            ₹{(posting.monthlyBillingSalary || 0).toLocaleString()}/month
                          </p>
                        </div>
                        {posting.remark && (
                          <div>
                            <p className="text-gray-500">Remark</p>
                            <p className="text-gray-700">{posting.remark}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/postings/${posting._id}`)}
                      className="text-blue-600"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeHistory;