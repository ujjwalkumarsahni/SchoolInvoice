// pages/Employees/CreateEmployee.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserIcon,
  BriefcaseIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  IdentificationIcon,
  BuildingOfficeIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { createEmployee, getEmployee, updateEmployee } from '../../services/api.js';
import Button from '../../components/Common/Button.jsx';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';

const CreateEmployee = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [activeSection, setActiveSection] = useState('basic');
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    employeeId: '',
    designation: '',
    department: '',
    reportingManager: '',
    dateOfJoining: new Date().toISOString().split('T')[0],
    employmentType: 'Full-Time',
    workMode: 'Onsite',
    workLocation: '',
    salary: '',
    
    contactNumber: '',
    personalEmail: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    
    currentAddress: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    
    emergencyContact: {
      name: '',
      number: '',
      relation: ''
    },
    
    bankDetails: {
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branch: ''
    },
    
    panNumber: '',
    aadhaarNumber: ''
  });

  useEffect(() => {
    if (id) {
      fetchEmployeeDetails();
    }
  }, [id]);

  const fetchEmployeeDetails = async () => {
    setFetching(true);
    try {
      const response = await getEmployee(id);
      const employeeData = response.data?.data || response.data;
      
      if (employeeData) {
        setFormData({
          name: employeeData.user?.name || '',
          email: employeeData.user?.email || '',
          password: '',
          employeeId: employeeData.basicInfo?.employeeId || '',
          designation: employeeData.basicInfo?.designation || '',
          department: employeeData.basicInfo?.department || '',
          reportingManager: employeeData.basicInfo?.reportingManager || '',
          dateOfJoining: employeeData.basicInfo?.dateOfJoining 
            ? new Date(employeeData.basicInfo.dateOfJoining).toISOString().split('T')[0] 
            : new Date().toISOString().split('T')[0],
          employmentType: employeeData.basicInfo?.employmentType || 'Full-Time',
          workMode: employeeData.basicInfo?.workMode || 'Onsite',
          workLocation: employeeData.basicInfo?.workLocation || '',
          salary: employeeData.basicInfo?.salary || '',
          
          contactNumber: employeeData.personalDetails?.contactNumber || '',
          personalEmail: employeeData.personalDetails?.personalEmail || '',
          dateOfBirth: employeeData.personalDetails?.dateOfBirth 
            ? new Date(employeeData.personalDetails.dateOfBirth).toISOString().split('T')[0] 
            : '',
          gender: employeeData.personalDetails?.gender || '',
          bloodGroup: employeeData.personalDetails?.bloodGroup || '',
          
          currentAddress: {
            street: employeeData.personalDetails?.currentAddress?.street || '',
            city: employeeData.personalDetails?.currentAddress?.city || '',
            state: employeeData.personalDetails?.currentAddress?.state || '',
            pincode: employeeData.personalDetails?.currentAddress?.pincode || '',
            country: employeeData.personalDetails?.currentAddress?.country || 'India'
          },
          
          emergencyContact: {
            name: employeeData.personalDetails?.emergencyContact?.name || '',
            number: employeeData.personalDetails?.emergencyContact?.number || '',
            relation: employeeData.personalDetails?.emergencyContact?.relation || ''
          },
          
          bankDetails: {
            accountHolderName: employeeData.personalDetails?.bankDetails?.accountHolderName || '',
            bankName: employeeData.personalDetails?.bankDetails?.bankName || '',
            accountNumber: employeeData.personalDetails?.bankDetails?.accountNumber || '',
            ifscCode: employeeData.personalDetails?.bankDetails?.ifscCode || '',
            branch: employeeData.personalDetails?.bankDetails?.branch || ''
          },
          
          panNumber: employeeData.personalDetails?.panNumber || '',
          aadhaarNumber: employeeData.personalDetails?.aadhaarNumber || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch employee details:', error);
      toast.error('Failed to fetch employee details');
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateBasicInfo = () => {
    const newErrors = {};

    if (!formData.name) newErrors.name = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    
    if (!id && (!formData.password || formData.password.length < 6)) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.employeeId) newErrors.employeeId = 'Employee ID is required';
    if (!formData.designation) newErrors.designation = 'Designation is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.dateOfJoining) newErrors.dateOfJoining = 'Date of joining is required';
    if (!formData.employmentType) newErrors.employmentType = 'Employment type is required';
    if (!formData.workMode) newErrors.workMode = 'Work mode is required';
    if (!formData.workLocation) newErrors.workLocation = 'Work location is required';
    if (!formData.salary) newErrors.salary = 'Salary is required';
    else if (formData.salary <= 0) newErrors.salary = 'Salary must be greater than 0';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateBasicInfo()) {
      setActiveSection('basic');
      toast.error('Please fix the errors in Basic Information');
      return;
    }

    setLoading(true);
    try {
      const apiData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        employeeId: formData.employeeId,
        designation: formData.designation,
        department: formData.department,
        reportingManager: formData.reportingManager || undefined,
        dateOfJoining: formData.dateOfJoining,
        employmentType: formData.employmentType,
        workMode: formData.workMode,
        workLocation: formData.workLocation,
        salary: parseFloat(formData.salary),
        
        personalDetails: {
          contactNumber: formData.contactNumber,
          personalEmail: formData.personalEmail,
          dateOfBirth: formData.dateOfBirth || undefined,
          gender: formData.gender || undefined,
          bloodGroup: formData.bloodGroup || undefined,
          currentAddress: formData.currentAddress,
          emergencyContact: formData.emergencyContact,
          bankDetails: formData.bankDetails,
          panNumber: formData.panNumber,
          aadhaarNumber: formData.aadhaarNumber
        }
      };

      if (id) {
        await updateEmployee(id, apiData);
        toast.success('Employee updated successfully');
      } else {
        await createEmployee(apiData);
        toast.success('Employee created successfully');
      }
      
      navigate('/employees');
    } catch (error) {
      console.error('Failed to save employee:', error);
      toast.error(error.response?.data?.message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'basic', name: 'Basic Info', icon: UserIcon },
    { id: 'employment', name: 'Employment', icon: BriefcaseIcon },
    { id: 'personal', name: 'Personal', icon: IdentificationIcon },
    { id: 'address', name: 'Address', icon: MapPinIcon },
    { id: 'emergency', name: 'Emergency', icon: PhoneIcon },
    { id: 'bank', name: 'Bank', icon: BanknotesIcon }
  ];

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/employees')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Employees
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">
          {id ? 'Edit Employee' : 'Add New Employee'}
        </h1>
        <p className="text-gray-500 mt-1">
          {id ? 'Update employee information' : 'Register a new employee in the system'}
        </p>
      </div>

      {/* Section Navigation */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.name}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Basic Information Section */}
          {activeSection === 'basic' && (
            <div className="p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter full name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!!id}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    } ${id ? 'bg-gray-100' : ''}`}
                    placeholder="employee@company.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                {!id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Minimum 6 characters"
                    />
                    {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    disabled={!!id}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.employeeId ? 'border-red-500' : 'border-gray-300'
                    } ${id ? 'bg-gray-100' : ''}`}
                    placeholder="e.g., EMP001"
                  />
                  {errors.employeeId && <p className="mt-1 text-sm text-red-600">{errors.employeeId}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.designation ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Senior Trainer"
                  />
                  {errors.designation && <p className="mt-1 text-sm text-red-600">{errors.designation}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.department ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Training"
                  />
                  {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Joining <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfJoining"
                    value={formData.dateOfJoining}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.dateOfJoining ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.dateOfJoining && <p className="mt-1 text-sm text-red-600">{errors.dateOfJoining}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reporting Manager
                  </label>
                  <input
                    type="text"
                    name="reportingManager"
                    value={formData.reportingManager}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Manager name/ID"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Employment Details Section */}
          {activeSection === 'employment' && (
            <div className="p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Employment Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employment Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.employmentType ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Intern">Intern</option>
                    <option value="Contract">Contract</option>
                  </select>
                  {errors.employmentType && <p className="mt-1 text-sm text-red-600">{errors.employmentType}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Work Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="workMode"
                    value={formData.workMode}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.workMode ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="Onsite">Onsite</option>
                    <option value="Work-from-Home">Work-from-Home</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                  {errors.workMode && <p className="mt-1 text-sm text-red-600">{errors.workMode}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Work Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="workLocation"
                    value={formData.workLocation}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.workLocation ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., New Delhi"
                  />
                  {errors.workLocation && <p className="mt-1 text-sm text-red-600">{errors.workLocation}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Salary (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.salary ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 50000"
                  />
                  {errors.salary && <p className="mt-1 text-sm text-red-600">{errors.salary}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Personal Details Section */}
          {activeSection === 'personal' && (
            <div className="p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Personal Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input
                    type="tel"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10 digit mobile number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email</label>
                  <input
                    type="email"
                    name="personalEmail"
                    value={formData.personalEmail}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="personal@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Address Section */}
          {activeSection === 'address' && (
            <div className="p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Current Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    name="currentAddress.street"
                    value={formData.currentAddress.street}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="House/Street no."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="currentAddress.city"
                    value={formData.currentAddress.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    name="currentAddress.state"
                    value={formData.currentAddress.state}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    name="currentAddress.pincode"
                    value={formData.currentAddress.pincode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Pincode"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    name="currentAddress.country"
                    value={formData.currentAddress.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Emergency Contact Section */}
          {activeSection === 'emergency' && (
            <div className="p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Emergency Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="emergencyContact.name"
                    value={formData.emergencyContact.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contact person name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="emergencyContact.number"
                    value={formData.emergencyContact.number}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10 digit number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                  <input
                    type="text"
                    name="emergencyContact.relation"
                    value={formData.emergencyContact.relation}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Father, Spouse"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bank Details Section */}
          {activeSection === 'bank' && (
            <div className="p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Bank Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    name="bankDetails.accountHolderName"
                    value={formData.bankDetails.accountHolderName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="As per bank records"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    name="bankDetails.bankName"
                    value={formData.bankDetails.bankName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Bank name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    name="bankDetails.accountNumber"
                    value={formData.bankDetails.accountNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Account number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    name="bankDetails.ifscCode"
                    value={formData.bankDetails.ifscCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="IFSC code"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <input
                    type="text"
                    name="bankDetails.branch"
                    value={formData.bankDetails.branch}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Branch name"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Tax Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                    <input
                      type="text"
                      name="panNumber"
                      value={formData.panNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ABCDE1234F"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
                    <input
                      type="text"
                      name="aadhaarNumber"
                      value={formData.aadhaarNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="12 digit number"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
            <div>
              {sections.findIndex(s => s.id === activeSection) > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    setActiveSection(sections[currentIndex - 1].id);
                  }}
                >
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/employees')}
              >
                Cancel
              </Button>
              {sections.findIndex(s => s.id === activeSection) < sections.length - 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    setActiveSection(sections[currentIndex + 1].id);
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="secondary"
                  loading={loading}
                >
                  {id ? 'Update Employee' : 'Create Employee'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Tips Card */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">Quick Tips</h3>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>• Fields marked with * are required in Basic Information</li>
              <li>• Employee ID and Email cannot be changed after creation</li>
              <li>• You can complete other sections later from employee profile</li>
              <li>• A welcome email will be sent with login credentials</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateEmployee;