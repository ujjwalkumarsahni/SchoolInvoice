// pages/EmployeePostings/PostingDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  UserIcon,
  BuildingOfficeIcon,
  CurrencyRupeeIcon,
  CalendarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  BriefcaseIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { getPosting, updatePosting } from '../../services/api.js';
import Button from '../../components/Common/Button.jsx';
import Badge from '../../components/Common/Badge.jsx';
import Modal from '../../components/Common/Modal.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext.jsx';

const PostingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [posting, setPosting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [formData, setFormData] = useState({
    monthlyBillingSalary: '',
    remark: '',
    tdsPercent: 0,
    gstPercent: 0
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPostingDetails();
  }, [id]);

  const fetchPostingDetails = async () => {
    setLoading(true);
    try {
      const response = await getPosting(id);
      
      let postingData = null;
      if (response.data) {
        if (response.data.data) {
          postingData = response.data.data;
        } else {
          postingData = response.data;
        }
      }
      
      setPosting(postingData);
      setFormData({
        monthlyBillingSalary: postingData?.monthlyBillingSalary || '',
        remark: postingData?.remark || '',
        tdsPercent: postingData?.tdsPercent || 0,
        gstPercent: postingData?.gstPercent || 0
      });
    } catch (error) {
      console.error('Failed to fetch posting:', error);
      toast.error('Failed to fetch posting details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await updatePosting(id, formData);
      toast.success('Posting updated successfully');
      setShowEditModal(false);
      fetchPostingDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update posting');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await updatePosting(id, { status: newStatus });
      toast.success(`Status changed to ${newStatus.replace('_', ' ')}`);
      setShowStatusModal(false);
      fetchPostingDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'continue': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'change_school': return <BuildingOfficeIcon className="w-5 h-5 text-blue-500" />;
      case 'resign': return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'terminate': return <XCircleIcon className="w-5 h-5 text-red-500" />;
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

  if (!posting) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Posting not found</h3>
        <p className="text-gray-500 mb-4">The posting you're looking for doesn't exist.</p>
        <Button variant="primary" onClick={() => navigate('/postings')} icon={ArrowLeftIcon}>
          Back to Postings
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
            onClick={() => navigate('/postings')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-gray-900">
                Posting Details
              </h1>
              {getStatusBadge(posting.status, posting.isActive)}
            </div>
            <p className="text-sm text-gray-500">
              Created on {format(new Date(posting.createdAt), 'dd MMM yyyy')}
            </p>
          </div>
        </div>

        {canManage && posting.isActive && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowStatusModal(true)}
              icon={ArrowPathIcon}
            >
              Change Status
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEditModal(true)}
              icon={PencilIcon}
            >
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <BriefcaseIcon className="w-6 h-6 text-blue-600 mb-2" />
          <p className="text-xl font-semibold">{posting.employee?.basicInfo?.designation || 'N/A'}</p>
          <p className="text-sm text-gray-600">Designation</p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <BuildingOfficeIcon className="w-6 h-6 text-green-600 mb-2" />
          <p className="text-xl font-semibold">{posting.school?.name || 'N/A'}</p>
          <p className="text-sm text-gray-600">School</p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <CurrencyRupeeIcon className="w-6 h-6 text-purple-600 mb-2" />
          <p className="text-xl font-semibold">₹{(posting.monthlyBillingSalary || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-600">Monthly Rate</p>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4">
          <CalendarIcon className="w-6 h-6 text-yellow-600 mb-2" />
          <p className="text-xl font-semibold">
            {posting.startDate ? format(new Date(posting.startDate), 'dd MMM') : 'N/A'}
          </p>
          <p className="text-sm text-gray-600">Started</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Employee Information</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">{posting.employee?.basicInfo?.fullName}</p>
                <p className="text-sm text-gray-500">ID: {posting.employee?.basicInfo?.employeeId}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Designation</p>
                <p className="font-medium">{posting.employee?.basicInfo?.designation}</p>
              </div>
              <div>
                <p className="text-gray-500">Department</p>
                <p className="font-medium">{posting.employee?.basicInfo?.department}</p>
              </div>
              <div>
                <p className="text-gray-500">Employment Type</p>
                <p className="font-medium">{posting.employee?.basicInfo?.employmentType}</p>
              </div>
              <div>
                <p className="text-gray-500">Work Mode</p>
                <p className="font-medium">{posting.employee?.basicInfo?.workMode}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/employees/${posting.employee?._id}`)}
                icon={UserIcon}
                className="text-blue-600"
              >
                View Full Profile
              </Button>
            </div>
          </div>
        </div>

        {/* School Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <BuildingOfficeIcon className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">School Information</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-900">{posting.school?.name}</p>
              <p className="text-sm text-gray-500">{posting.school?.city}</p>
            </div>
            
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-gray-400" />
                <span>{posting.school?.contactPersonName}</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneIcon className="w-4 h-4 text-gray-400" />
                <span>{posting.school?.mobile}</span>
              </div>
              <div className="flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                <span className="truncate">{posting.school?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-gray-400" />
                <span>{posting.school?.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posting Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Posting Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Monthly Billing</p>
            <p className="text-2xl font-bold text-blue-600">
              ₹{(posting.monthlyBillingSalary || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">per month</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">Duration</p>
            <p className="text-lg font-medium">
              {posting.startDate ? format(new Date(posting.startDate), 'dd MMM yyyy') : 'N/A'}
            </p>
            {posting.endDate ? (
              <p className="text-sm text-gray-500">
                to {format(new Date(posting.endDate), 'dd MMM yyyy')}
              </p>
            ) : (
              <p className="text-sm text-green-600">• Ongoing</p>
            )}
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">Status</p>
            <div className="flex items-center gap-2">
              {getStatusIcon(posting.status)}
              <span className="text-lg font-medium capitalize">
                {posting.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Tax Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">TDS Percentage</p>
            <p className="text-xl font-semibold">{posting.tdsPercent || 0}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">GST Percentage</p>
            <p className="text-xl font-semibold">{posting.gstPercent || 0}%</p>
          </div>
        </div>
      </div>

      {/* Remark */}
      {posting.remark && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Remark</h3>
          <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{posting.remark}</p>
        </div>
      )}

      {/* Audit Trail */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Audit Trail</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Created By</p>
            <p className="font-medium">{posting.createdBy?.name || 'N/A'}</p>
            <p className="text-xs text-gray-400">
              {posting.createdAt ? format(new Date(posting.createdAt), 'dd MMM yyyy, hh:mm a') : ''}
            </p>
          </div>
          {posting.updatedBy && (
            <div>
              <p className="text-gray-500">Last Updated By</p>
              <p className="font-medium">{posting.updatedBy?.name || 'N/A'}</p>
              <p className="text-xs text-gray-400">
                {posting.updatedAt ? format(new Date(posting.updatedAt), 'dd MMM yyyy, hh:mm a') : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Posting"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Billing Salary (₹)
            </label>
            <input
              type="number"
              name="monthlyBillingSalary"
              value={formData.monthlyBillingSalary}
              onChange={handleInputChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TDS %</label>
              <input
                type="number"
                name="tdsPercent"
                value={formData.tdsPercent}
                onChange={handleInputChange}
                min="0"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST %</label>
              <input
                type="number"
                name="gstPercent"
                value={formData.gstPercent}
                onChange={handleInputChange}
                min="0"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={updating}>
              Update
            </Button>
          </div>
        </form>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Change Status"
      >
        <div className="space-y-4">
          <p className="text-gray-700">Select new status for this posting:</p>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleStatusChange('continue')}
              disabled={posting.status === 'continue'}
              className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                posting.status === 'continue'
                  ? 'bg-green-50 border-green-300 text-green-700 cursor-not-allowed'
                  : 'border-gray-300 hover:bg-green-50 hover:border-green-300 hover:text-green-700'
              }`}
            >
              Continue
            </button>
            <button
              onClick={() => handleStatusChange('change_school')}
              disabled={posting.status === 'change_school'}
              className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                posting.status === 'change_school'
                  ? 'bg-blue-50 border-blue-300 text-blue-700 cursor-not-allowed'
                  : 'border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              Change School
            </button>
            <button
              onClick={() => handleStatusChange('resign')}
              disabled={posting.status === 'resign'}
              className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                posting.status === 'resign'
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700 cursor-not-allowed'
                  : 'border-gray-300 hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700'
              }`}
            >
              Resign
            </button>
            <button
              onClick={() => handleStatusChange('terminate')}
              disabled={posting.status === 'terminate'}
              className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                posting.status === 'terminate'
                  ? 'bg-red-50 border-red-300 text-red-700 cursor-not-allowed'
                  : 'border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700'
              }`}
            >
              Terminate
            </button>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PostingDetails;