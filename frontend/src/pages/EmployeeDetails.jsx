import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  MapPin,
  Building2,
  DollarSign,
  CreditCard,
  FileText,
  Award,
  BookOpen,
  Home,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  ArrowLeft,
  Download,
  Clock,
  Users,
  Shield,
  Heart,
  Hash,
  FileSignature,
  Landmark,
  IdCard,
  GraduationCap,
  Activity,
  UserCog
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    fetchEmployeeDetails();
  }, [id]);

  const fetchEmployeeDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/employee/hr/employees/${id}`);
      setEmployee(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch employee details');
      navigate('/employees');
    } finally {
      setLoading(false);
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

  const getGenderIcon = (gender) => {
    switch(gender) {
      case 'Male': return '♂️';
      case 'Female': return '♀️';
      case 'Other': return '⚧';
      default: return '👤';
    }
  };

  const getBloodGroupColor = (bloodGroup) => {
    const colors = {
      'A+': 'bg-red-100 text-red-800',
      'A-': 'bg-red-100 text-red-800',
      'B+': 'bg-red-100 text-red-800',
      'B-': 'bg-red-100 text-red-800',
      'AB+': 'bg-purple-100 text-purple-800',
      'AB-': 'bg-purple-100 text-purple-800',
      'O+': 'bg-green-100 text-green-800',
      'O-': 'bg-green-100 text-green-800'
    };
    return colors[bloodGroup] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'personal', label: 'Personal Details', icon: Heart },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'bank', label: 'Bank Details', icon: Landmark },
    { id: 'training', label: 'Training', icon: GraduationCap },
    { id: 'exit', label: 'Exit Details', icon: Activity }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/employees')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Details</h1>
            <p className="text-sm text-gray-600 mt-1">
              View complete employee information
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to={`/employees/edit/${employee._id}`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Employee
          </Link>
        </div>
      </div>

      {/* Employee Header Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
              <span className="text-4xl font-bold text-blue-600">
                {employee.basicInfo?.fullName?.charAt(0) || 'E'}
              </span>
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-bold">{employee.basicInfo?.fullName || 'N/A'}</h2>
              <div className="flex items-center mt-2 space-x-4">
                <span className="flex items-center text-blue-100">
                  <Hash className="h-4 w-4 mr-1" />
                  {employee.basicInfo?.employeeId}
                </span>
                <span className="flex items-center text-blue-100">
                  <Briefcase className="h-4 w-4 mr-1" />
                  {employee.basicInfo?.designation}
                </span>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(employee.basicInfo?.employeeStatus)}`}>
                  {employee.basicInfo?.employeeStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-gray-200">
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Department</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{employee.basicInfo?.department}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Work Mode</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{employee.basicInfo?.workMode}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Date of Joining</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{formatDate(employee.basicInfo?.dateOfJoining)}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Employment Type</p>
            <span className={`px-3 py-1 text-xs font-medium rounded-full inline-block mt-2 ${getEmploymentTypeBadge(employee.basicInfo?.employmentType)}`}>
              {employee.basicInfo?.employmentType}
            </span>
          </div>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Completion</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{employee.completionStatus?.overallPercentage || 25}%</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 px-1 py-4 text-sm font-medium border-b-2 
                  transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="text-base font-medium text-gray-900 mt-1">{employee.basicInfo?.fullName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Employee ID</p>
                <p className="text-base font-medium text-gray-900 mt-1">{employee.basicInfo?.employeeId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Designation</p>
                <p className="text-base font-medium text-gray-900 mt-1">{employee.basicInfo?.designation || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="text-base font-medium text-gray-900 mt-1">{employee.basicInfo?.department || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Reporting Manager</p>
                <p className="text-base font-medium text-gray-900 mt-1">
                  {employee.basicInfo?.reportingManager?.name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Work Location</p>
                <p className="text-base font-medium text-gray-900 mt-1">{employee.basicInfo?.workLocation || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Salary</p>
                <p className="text-base font-medium text-gray-900 mt-1">{formatCurrency(employee.basicInfo?.salary)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Employee Status</p>
                <span className={`px-3 py-1 text-xs font-medium rounded-full inline-block mt-2 ${getStatusColor(employee.basicInfo?.employeeStatus)}`}>
                  {employee.basicInfo?.employeeStatus}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Personal Details Tab */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Heart className="h-5 w-5 mr-2 text-blue-600" />
              Personal Details
            </h3>
            
            {/* Contact Information */}
            <div className="border-b border-gray-200 pb-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500 flex items-center">
                    <Mail className="h-4 w-4 mr-1 text-gray-400" /> Email
                  </p>
                  <p className="text-base font-medium text-gray-900 mt-1">{employee.user?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 flex items-center">
                    <Phone className="h-4 w-4 mr-1 text-gray-400" /> Contact Number
                  </p>
                  <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails?.contactNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 flex items-center">
                    <Phone className="h-4 w-4 mr-1 text-gray-400" /> Alternate Number
                  </p>
                  <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails?.alternateContactNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 flex items-center">
                    <Mail className="h-4 w-4 mr-1 text-gray-400" /> Personal Email
                  </p>
                  <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails?.personalEmail || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="border-b border-gray-200 pb-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Personal Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="text-base font-medium text-gray-900 mt-1">{formatDate(employee.personalDetails?.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {employee.personalDetails?.gender} {getGenderIcon(employee.personalDetails?.gender)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Blood Group</p>
                  {employee.personalDetails?.bloodGroup ? (
                    <span className={`px-3 py-1 text-xs font-medium rounded-full inline-block mt-2 ${getBloodGroupColor(employee.personalDetails?.bloodGroup)}`}>
                      {employee.personalDetails?.bloodGroup}
                    </span>
                  ) : (
                    <p className="text-base font-medium text-gray-900 mt-1">N/A</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Marital Status</p>
                  <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails?.maritalStatus || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">PAN Number</p>
                  <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails?.panNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Aadhaar Number</p>
                  <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails?.aadhaarNumber || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="border-b border-gray-200 pb-6">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <Home className="h-4 w-4 mr-2 text-gray-500" />
                Current Address
              </h4>
              {employee.personalDetails?.currentAddress ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Street</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.currentAddress.street || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">City</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.currentAddress.city || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">State</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.currentAddress.state || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pincode</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.currentAddress.pincode || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No address provided</p>
              )}

              <h4 className="text-md font-medium text-gray-900 mb-4 mt-6 flex items-center">
                <Home className="h-4 w-4 mr-2 text-gray-500" />
                Permanent Address
              </h4>
              {employee.personalDetails?.permanentAddress ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Street</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.permanentAddress.street || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">City</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.permanentAddress.city || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">State</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.permanentAddress.state || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pincode</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.permanentAddress.pincode || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No address provided</p>
              )}
            </div>

            {/* Emergency Contact */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 text-gray-500" />
                Emergency Contact
              </h4>
              {employee.personalDetails?.emergencyContact ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.emergencyContact.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Number</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.emergencyContact.number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Relation</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.emergencyContact.relation || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.emergencyContact.address || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No emergency contact provided</p>
              )}
            </div>
          </div>
        )}

        {/* Bank Details Tab */}
        {activeTab === 'bank' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Landmark className="h-5 w-5 mr-2 text-blue-600" />
              Bank Account Details
            </h3>
            {employee.personalDetails?.bankDetails ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Account Holder Name</p>
                  <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.bankDetails.accountHolderName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bank Name</p>
                  <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.bankDetails.bankName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Account Number</p>
                  <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.bankDetails.accountNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IFSC Code</p>
                  <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.bankDetails.ifscCode || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Branch</p>
                  <p className="text-base font-medium text-gray-900 mt-1">{employee.personalDetails.bankDetails.branch || 'N/A'}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Landmark className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No bank details provided</p>
              </div>
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Documents
            </h3>
            
            {/* Required Documents */}
            <div className="border-b border-gray-200 pb-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Required Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Offer Letter', value: employee.documents?.offerLetter },
                  { label: 'Appointment Letter', value: employee.documents?.appointmentLetter },
                  { label: 'Resume', value: employee.documents?.resume },
                  { label: 'Passport Photo', value: employee.documents?.passportPhoto },
                  { label: 'PAN Card', value: employee.documents?.panCard },
                  { label: 'Aadhaar Card', value: employee.documents?.aadhaarCard },
                  { label: 'Address Proof', value: employee.documents?.addressProof },
                  { label: 'NDA Agreement', value: employee.documents?.ndaAgreement },
                  { label: 'Bond Agreement', value: employee.documents?.bondAgreement }
                ].map((doc, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">{doc.label}</p>
                    {doc.value ? (
                      <a 
                        href={doc.value} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center mt-1"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View Document
                      </a>
                    ) : (
                      <p className="text-sm text-gray-400 mt-1">Not uploaded</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Educational Certificates */}
            {employee.documents?.educationalCertificates?.length > 0 && (
              <div className="border-b border-gray-200 pb-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Educational Certificates</h4>
                <div className="space-y-2">
                  {employee.documents.educationalCertificates.map((cert, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cert.certificateName}</p>
                        <p className="text-xs text-gray-500">Uploaded: {formatDate(cert.uploadedAt)}</p>
                      </div>
                      <a 
                        href={cert.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience Letters */}
            {employee.documents?.experienceLetters?.length > 0 && (
              <div className="border-b border-gray-200 pb-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Experience Letters</h4>
                <div className="space-y-2">
                  {employee.documents.experienceLetters.map((exp, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{exp.companyName}</p>
                        <p className="text-xs text-gray-500">Uploaded: {formatDate(exp.uploadedAt)}</p>
                      </div>
                      <a 
                        href={exp.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Employment Tab */}
        {activeTab === 'employment' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
              Employment History
            </h3>
            <p className="text-gray-500 text-center py-8">
              Employment history and current postings will be displayed here
            </p>
          </div>
        )}

        {/* Training Tab */}
        {activeTab === 'training' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-blue-600" />
              Training & Development
            </h3>
            {employee.training?.length > 0 ? (
              <div className="space-y-4">
                {employee.training.map((training, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-900">{training.name}</h4>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {training.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Organizer: {training.organizer}</p>
                    <p className="text-sm text-gray-600">Date: {formatDate(training.date)}</p>
                    {training.certificate && (
                      <a 
                        href={training.certificate} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center mt-2"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        View Certificate
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No training records found</p>
            )}
          </div>
        )}

        {/* Exit Details Tab */}
        {activeTab === 'exit' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-600" />
              Exit Details
            </h3>
            {employee.exitDetails ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Resignation Date</p>
                  <p className="text-base font-medium text-gray-900 mt-1">{formatDate(employee.exitDetails.resignationDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Notice Period</p>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {formatDate(employee.exitDetails.noticePeriodStart)} - {formatDate(employee.exitDetails.noticePeriodEnd)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Relieving Date</p>
                  <p className="text-base font-medium text-gray-900 mt-1">{formatDate(employee.exitDetails.relievingDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Clearance Status</p>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full inline-block mt-2 ${
                    employee.exitDetails.clearanceStatus === 'Completed' ? 'bg-green-100 text-green-800' :
                    employee.exitDetails.clearanceStatus === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {employee.exitDetails.clearanceStatus}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Exit Reason</p>
                  <p className="text-base font-medium text-gray-900 mt-1">{employee.exitDetails.exitReason || 'N/A'}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No exit details available</p>
            )}
          </div>
        )}
      </div>

      {/* System Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="h-4 w-4 mr-2 text-gray-500" />
          System Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Created By</p>
            <p className="font-medium text-gray-900 mt-1">{employee.createdBy?.name || 'N/A'}</p>
            <p className="text-xs text-gray-500 mt-1">{formatDate(employee.createdAt)}</p>
          </div>
          {employee.lastUpdatedBy && (
            <div>
              <p className="text-gray-500">Last Updated By</p>
              <p className="font-medium text-gray-900 mt-1">{employee.lastUpdatedBy?.name || 'N/A'}</p>
              <p className="text-xs text-gray-500 mt-1">{formatDate(employee.updatedAt)}</p>
            </div>
          )}
          <div>
            <p className="text-gray-500">Last Profile Update</p>
            <p className="font-medium text-gray-900 mt-1">{formatDate(employee.lastProfileUpdate)}</p>
          </div>
          <div>
            <p className="text-gray-500">Verification Status</p>
            <span className={`px-3 py-1 text-xs font-medium rounded-full inline-block mt-2 ${
              employee.verification?.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {employee.verification?.isVerified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetails;