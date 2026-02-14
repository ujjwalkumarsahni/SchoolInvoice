// pages/Schools/SchoolDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { getSchool, getSchoolTrainers } from '../../services/api.js';
import { getInvoices } from '../../services/api.js';
import Button from '../../components/Common/Button.jsx';
import Badge from '../../components/Common/Badge.jsx';
import Table from '../../components/Common/Table.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext.jsx';

const SchoolDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [school, setSchool] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchSchoolDetails();
  }, [id]);

  const fetchSchoolDetails = async () => {
    setLoading(true);
    try {
      const schoolRes = await getSchool(id);
      let schoolData = schoolRes.data?.data || schoolRes.data;
      setSchool(schoolData);
      
      const trainersRes = await getSchoolTrainers(id);
      let trainersData = trainersRes.data?.data?.trainers || trainersRes.data?.trainers || [];
      setTrainers(trainersData);
      
      const invoicesRes = await getInvoices({ school: id, limit: 5 });
      let invoicesData = invoicesRes.data?.data || invoicesRes.data || [];
      setInvoices(invoicesData);
      
    } catch (error) {
      console.error('Failed to fetch school details:', error);
      toast.error('Failed to fetch school details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border border-green-200' 
      : 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const getTrainerStatusColor = (status) => {
    const colors = {
      'adequate': 'bg-green-100 text-green-800 border border-green-200',
      'shortage': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'critical': 'bg-red-100 text-red-800 border border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const getInvoiceStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800 border border-gray-200',
      verified: 'bg-blue-100 text-blue-800 border border-blue-200',
      sent: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      paid: 'bg-green-100 text-green-800 border border-green-200',
      overdue: 'bg-red-100 text-red-800 border border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const trainerColumns = [
    {
      key: 'name',
      header: 'Trainer',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
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
      cell: (row) => <span className="text-sm text-gray-600">{row.basicInfo?.designation}</span>,
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (row) => (
        <div className="flex items-center text-sm text-gray-600">
          <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
          {row.personalDetails?.contactNumber || 'N/A'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <button
          onClick={() => navigate(`/employees/${row._id}`)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="View Employee Details"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const invoiceColumns = [
    {
      key: 'number',
      header: 'Invoice No.',
      cell: (row) => (
        <span 
          className="text-sm font-medium text-blue-600 cursor-pointer hover:underline"
          onClick={() => navigate(`/invoices/${row._id}`)}
        >
          {row.invoiceNumber}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      cell: (row) => format(new Date(row.invoiceDate), 'dd MMM yyyy'),
    },
    {
      key: 'period',
      header: 'Period',
      cell: (row) => `${format(new Date(row.year, row.month - 1, 1), 'MMM yyyy')}`,
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => (
        <span className="font-medium">₹{row.totalPayable?.toLocaleString()}</span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      cell: (row) => (
        <span className={row.balanceDue > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
          ₹{row.balanceDue?.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge className={getInvoiceStatusColor(row.status)}>
          {row.status}
        </Badge>
      ),
    },
  ];

  const canManage = ['admin', 'superadmin', 'hr'].includes(user?.role);
  const trainerStatus = school?.trainerStatus || 'critical';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="text-center py-12">
        <BuildingOfficeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">School not found</h3>
        <p className="text-gray-500 mb-4">The school you're looking for doesn't exist.</p>
        <Button variant="primary" onClick={() => navigate('/schools')} icon={ArrowLeftIcon}>
          Back to Schools
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
            onClick={() => navigate('/schools')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-gray-900">{school.name}</h1>
              <Badge className={getStatusColor(school.status)}>
                {school.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 flex items-center">
              <MapPinIcon className="w-4 h-4 mr-1" />
              {school.city} • Added on {format(new Date(school.createdAt), 'dd MMM yyyy')}
            </p>
          </div>
        </div>

        {canManage && (
          <Button
            variant="secondary"
            onClick={() => navigate(`/schools/edit/${id}`)}
            icon={PencilIcon}
            className="border-2"
          >
            Edit School
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <BuildingOfficeIcon className="w-6 h-6 text-blue-600 mb-2" />
          <p className="text-2xl font-semibold">{school.trainersRequired}</p>
          <p className="text-sm text-gray-600">Trainers Required</p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <UserGroupIcon className="w-6 h-6 text-green-600 mb-2" />
          <p className="text-2xl font-semibold">{school.trainersCount || 0}</p>
          <p className="text-sm text-gray-600">Current Trainers</p>
        </div>
        
        <div className={`rounded-lg p-4 ${
          trainerStatus === 'adequate' ? 'bg-green-50' :
          trainerStatus === 'shortage' ? 'bg-yellow-50' : 'bg-red-50'
        }`}>
          <div className={`w-6 h-6 rounded-full mb-2 flex items-center justify-center ${
            trainerStatus === 'adequate' ? 'bg-green-200' :
            trainerStatus === 'shortage' ? 'bg-yellow-200' : 'bg-red-200'
          }`}>
            <CheckCircleIcon className={`w-4 h-4 ${
              trainerStatus === 'adequate' ? 'text-green-600' :
              trainerStatus === 'shortage' ? 'text-yellow-600' : 'text-red-600'
            }`} />
          </div>
          <p className="text-2xl font-semibold capitalize">{trainerStatus}</p>
          <p className="text-sm text-gray-600">Trainer Status</p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <CurrencyRupeeIcon className="w-6 h-6 text-purple-600 mb-2" />
          <p className="text-2xl font-semibold">
            ₹{invoices?.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Outstanding</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('trainers')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'trainers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserGroupIcon className="w-4 h-4" />
            Trainers ({trainers.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            Invoices ({invoices.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <UserIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Contact Person</p>
                    <p className="font-medium">{school.contactPersonName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <PhoneIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Mobile</p>
                    <p className="font-medium">{school.mobile}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <EnvelopeIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{school.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Address</h3>
              <div className="flex items-start gap-3">
                <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-700">{school.address}</p>
                  <p className="text-gray-500 mt-1">{school.city}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/postings?school=${school._id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <UserGroupIcon className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">View All Postings</p>
                    <p className="text-sm text-gray-500">See all trainer assignments</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate(`/invoices?school=${school._id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <DocumentTextIcon className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium text-gray-900">View All Invoices</p>
                    <p className="text-sm text-gray-500">Track payment history</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/postings/new', { state: { schoolId: school._id } })}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <UserGroupIcon className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Assign New Trainer</p>
                    <p className="text-sm text-blue-700">Add trainer to this school</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">School Overview</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Trainer Requirement</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-semibold">{school.trainersCount || 0}</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-lg text-gray-600">{school.trainersRequired}</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${(school.trainersCount / school.trainersRequired) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                  <p className="text-2xl font-semibold text-green-600">
                    {((invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0) / 
                      (invoices.reduce((sum, inv) => sum + (inv.totalPayable || 0), 0) || 1)) * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Paid vs Total</p>
                </div>
              </div>

              {/* Recent Activity */}
              <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
              <div className="space-y-3">
                {invoices.slice(0, 3).map((invoice, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                    <Badge className={getInvoiceStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </div>
                ))}
                {invoices.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trainers' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Current Trainers</h3>
          </div>
          {trainers.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No trainers assigned</h3>
              <p className="text-gray-500 mb-4">No trainers are currently assigned to this school.</p>
              <Button
                variant="primary"
                onClick={() => navigate('/postings/new', { state: { schoolId: school._id } })}
                icon={UserGroupIcon}
              >
                Assign First Trainer
              </Button>
            </div>
          ) : (
            <Table columns={trainerColumns} data={trainers} />
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Recent Invoices</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/invoices?school=${school._id}`)}
                icon={ArrowTopRightOnSquareIcon}
              >
                View All
              </Button>
            </div>
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No invoices</h3>
                <p className="text-gray-500 mb-4">No invoices have been generated for this school yet.</p>
                {canManage && (
                  <Button
                    variant="primary"
                    onClick={() => navigate('/invoices')}
                  >
                    Generate Invoice
                  </Button>
                )}
              </div>
            ) : (
              <Table columns={invoiceColumns} data={invoices} />
            )}
          </div>

          {invoices.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Payment Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Invoiced</p>
                  <p className="text-xl font-bold">
                    ₹{invoices.reduce((sum, inv) => sum + (inv.totalPayable || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Paid</p>
                  <p className="text-xl font-bold text-green-600">
                    ₹{invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Outstanding</p>
                  <p className="text-xl font-bold text-red-600">
                    ₹{invoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-xl font-bold text-red-600">
                    ₹{invoices.filter(inv => inv.status === 'overdue')
                      .reduce((sum, inv) => sum + (inv.balanceDue || 0), 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SchoolDetails;