// pages/Employees/EmployeeDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  UserIcon,
  BriefcaseIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  IdentificationIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { getEmployee } from '../../services/api.js';
import { getEmployeePostingHistory } from '../../services/api.js';
import Button from '../../components/Common/Button.jsx';
import Badge from '../../components/Common/Badge.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext.jsx';

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [employee, setEmployee] = useState(null);
  const [postingHistory, setPostingHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    fetchEmployeeDetails();
  }, [id]);

  const fetchEmployeeDetails = async () => {
    setLoading(true);
    try {
      const employeeRes = await getEmployee(id);
      let employeeData = employeeRes.data?.data || employeeRes.data;
      setEmployee(employeeData);

      const historyRes = await getEmployeePostingHistory(id);
      let historyData = historyRes.data?.data || historyRes.data;
      setPostingHistory(historyData);

    } catch (error) {
      console.error('Failed to fetch employee details:', error);
      toast.error('Failed to fetch employee details');
    } finally {
      setLoading(false);
    }
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
      case 'Active': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'On-Notice': return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'Resigned':
      case 'Terminated': return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'Probation': return <ClockIcon className="w-5 h-5 text-blue-500" />;
      default: return null;
    }
  };

  const canManage = ['admin', 'superadmin', 'hr'].includes(user?.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Employee not found</h3>
        <p className="text-gray-500 mb-4">The employee you're looking for doesn't exist.</p>
        <Button variant="primary" onClick={() => navigate('/employees')} icon={ArrowLeftIcon}>
          Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/employees')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-gray-900">
                {employee.basicInfo?.fullName}
              </h1>
              <Badge className={getStatusColor(employee.basicInfo?.employeeStatus)}>
                {employee.basicInfo?.employeeStatus}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              ID: {employee.basicInfo?.employeeId} • Joined {employee.basicInfo?.dateOfJoining ? 
                format(new Date(employee.basicInfo.dateOfJoining), 'dd MMM yyyy') : 'N/A'}
            </p>
          </div>
        </div>

        {canManage && (
          <Button
            variant="secondary"
            onClick={() => navigate(`/employees/edit/${id}`)}
            icon={PencilIcon}
          >
            Edit Employee
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <BriefcaseIcon className="w-6 h-6 text-blue-600 mb-2" />
          <p className="text-xl font-semibold">{employee.basicInfo?.designation}</p>
          <p className="text-sm text-gray-600">Designation</p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <BuildingOfficeIcon className="w-6 h-6 text-green-600 mb-2" />
          <p className="text-xl font-semibold">{employee.basicInfo?.department}</p>
          <p className="text-sm text-gray-600">Department</p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <CurrencyRupeeIcon className="w-6 h-6 text-purple-600 mb-2" />
          <p className="text-xl font-semibold">₹{(employee.basicInfo?.salary || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-600">Monthly Salary</p>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4">
          <CalendarIcon className="w-6 h-6 text-yellow-600 mb-2" />
          <p className="text-xl font-semibold">
            {employee.basicInfo?.dateOfJoining ? 
              Math.floor((new Date() - new Date(employee.basicInfo.dateOfJoining)) / (1000 * 60 * 60 * 24 * 30)) : 0}
          </p>
          <p className="text-sm text-gray-600">Months with us</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('personal')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'personal'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Personal Info
          </button>
          <button
            onClick={() => setActiveTab('employment')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'employment'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Employment
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'bank'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Bank Details
          </button>
          <button
            onClick={() => setActiveTab('postings')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'postings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Postings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Personal Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-medium">
                    {employee.personalDetails?.dateOfBirth ? 
                      format(new Date(employee.personalDetails.dateOfBirth), 'dd MMM yyyy') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="font-medium capitalize">{employee.personalDetails?.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Blood Group</p>
                  <p className="font-medium">{employee.personalDetails?.bloodGroup || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Marital Status</p>
                  <p className="font-medium capitalize">{employee.personalDetails?.maritalStatus || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <PhoneIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Contact Number</p>
                  <p className="font-medium">{employee.personalDetails?.contactNumber || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Personal Email</p>
                  <p className="font-medium">{employee.personalDetails?.personalEmail || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 md:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4">Address</h3>
            <div className="flex items-start gap-3">
              <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium">
                  {employee.personalDetails?.currentAddress?.street || 'N/A'}
                </p>
                <p className="text-gray-600">
                  {employee.personalDetails?.currentAddress?.city || 'N/A'}, 
                  {employee.personalDetails?.currentAddress?.state || 'N/A'} - 
                  {employee.personalDetails?.currentAddress?.pincode || 'N/A'}
                </p>
                <p className="text-sm text-gray-500">{employee.personalDetails?.currentAddress?.country || 'India'}</p>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 md:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{employee.personalDetails?.emergencyContact?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-medium">{employee.personalDetails?.emergencyContact?.number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Relation</p>
                <p className="font-medium">{employee.personalDetails?.emergencyContact?.relation || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'employment' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Employment Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Designation</span>
                <span className="font-medium">{employee.basicInfo?.designation}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Department</span>
                <span className="font-medium">{employee.basicInfo?.department}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Employment Type</span>
                <span className="font-medium">{employee.basicInfo?.employmentType}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Work Mode</span>
                <span className="font-medium">{employee.basicInfo?.workMode}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Work Location</span>
                <span className="font-medium">{employee.basicInfo?.workLocation}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Reporting Manager</span>
                <span className="font-medium">{employee.basicInfo?.reportingManager?.name || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Salary & Benefits</h3>
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 mb-1">Monthly Salary</p>
              <p className="text-4xl font-bold text-blue-600">
                ₹{(employee.basicInfo?.salary || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">per month</p>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Annual Package</span>
                <span className="text-xl font-semibold">
                  ₹{((employee.basicInfo?.salary || 0) * 12).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Tax Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 md:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4">Tax Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">PAN Number</p>
                <p className="font-medium">{employee.personalDetails?.panNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Aadhaar Number</p>
                <p className="font-medium">{employee.personalDetails?.aadhaarNumber || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bank' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Bank Account Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Account Holder Name</p>
              <p className="font-medium text-lg">{employee.personalDetails?.bankDetails?.accountHolderName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Bank Name</p>
              <p className="font-medium">{employee.personalDetails?.bankDetails?.bankName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Account Number</p>
              <p className="font-medium font-mono">{employee.personalDetails?.bankDetails?.accountNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">IFSC Code</p>
              <p className="font-medium font-mono">{employee.personalDetails?.bankDetails?.ifscCode || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Branch</p>
              <p className="font-medium">{employee.personalDetails?.bankDetails?.branch || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'postings' && postingHistory && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Posting History</h3>
          
          {postingHistory.history?.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No posting history available</p>
          ) : (
            <div className="space-y-6">
              {/* Current Posting */}
              {postingHistory.current && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                        <BuildingOfficeIcon className="w-5 h-5 text-green-700" />
                      </div>
                      <div>
                        <p className="font-medium text-green-900">{postingHistory.current.school?.name}</p>
                        <p className="text-sm text-green-700">
                          Since {format(new Date(postingHistory.current.startDate), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/postings/${postingHistory.current._id}`)}
                      icon={ArrowTopRightOnSquareIcon}
                    >
                      View
                    </Button>
                  </div>
                </div>
              )}

              {/* Past Postings */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Past Postings</h4>
                {postingHistory.history?.filter(p => !p.isActive).map((posting) => (
                  <div key={posting._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{posting.school?.name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {format(new Date(posting.startDate), 'dd MMM yyyy')} - 
                          {posting.endDate ? format(new Date(posting.endDate), 'dd MMM yyyy') : 'Present'}
                        </p>
                        {posting.remark && (
                          <p className="text-sm text-gray-500 mt-2">{posting.remark}</p>
                        )}
                      </div>
                      <Badge className="bg-gray-200 text-gray-700">
                        {posting.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeDetails;