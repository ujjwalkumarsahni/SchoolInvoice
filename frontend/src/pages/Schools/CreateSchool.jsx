// pages/Schools/CreateSchool.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
  InformationCircleIcon,
  PhotoIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { createSchool, getSchool, updateSchool } from '../../services/api.js';
import Button from '../../components/Common/Button.jsx';
import Input from '../../components/Common/Input.jsx';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';

const CreateSchool = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [logoPreview, setLogoPreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    address: '',
    contactPersonName: '',
    mobile: '',
    email: '',
    status: 'active',
    trainersRequired: 1,
    logoBase64: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (id) {
      fetchSchoolDetails();
    }
  }, [id]);

  const fetchSchoolDetails = async () => {
    setFetching(true);
    try {
      const response = await getSchool(id);
      const schoolData = response.data?.data || response.data;
      
      if (schoolData) {
        setFormData({
          name: schoolData.name || '',
          city: schoolData.city || '',
          address: schoolData.address || '',
          contactPersonName: schoolData.contactPersonName || '',
          mobile: schoolData.mobile || '',
          email: schoolData.email || '',
          status: schoolData.status || 'active',
          trainersRequired: schoolData.trainersRequired || 1,
          logoBase64: ''
        });
        
        if (schoolData.logo?.url) {
          setLogoPreview(schoolData.logo.url);
        }
      }
    } catch (error) {
      console.error('Failed to fetch school details:', error);
      toast.error('Failed to fetch school details');
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo size should be less than 2MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        setFormData(prev => ({ ...prev, logoBase64: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) newErrors.name = 'School name is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.contactPersonName) newErrors.contactPersonName = 'Contact person name is required';
    
    if (!formData.mobile) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = 'Mobile number must be 10 digits';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      newErrors.email = 'Please provide a valid email';
    }
    
    if (!formData.trainersRequired || formData.trainersRequired < 1) {
      newErrors.trainersRequired = 'At least 1 trainer is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const apiData = {
        ...formData,
        trainersRequired: parseInt(formData.trainersRequired)
      };

      if (id) {
        await updateSchool(id, apiData);
        toast.success('School updated successfully');
      } else {
        await createSchool(apiData);
        toast.success('School created successfully');
      }
      
      navigate('/schools');
    } catch (error) {
      console.error('Failed to save school:', error);
      toast.error(error.response?.data?.message || 'Failed to save school');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/schools')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Schools
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">
          {id ? 'Edit School' : 'Add New School'}
        </h1>
        <p className="text-gray-500 mt-1">
          {id ? 'Update school information' : 'Register a new school in the system'}
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Progress Steps (for create mode) */}
        {!id && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium text-sm">
                  1
                </div>
                <span className="ml-2 text-sm font-medium text-gray-900">Basic Info</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-medium text-sm">
                  2
                </div>
                <span className="ml-2 text-sm text-gray-500">Contact</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-medium text-sm">
                  3
                </div>
                <span className="ml-2 text-sm text-gray-500">Requirements</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Logo Upload Section */}
          <div className="flex flex-col md:flex-row items-start gap-6 pb-6 border-b border-gray-200">
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School Logo
              </label>
            </div>
            <div className="flex-1">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="School logo preview"
                      className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <PhotoIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <PhotoIcon className="w-5 h-5 mr-2 text-gray-500" />
                    Choose Logo
                  </label>
                  <p className="mt-2 text-xs text-gray-500">
                    PNG, JPG or GIF (max. 2MB)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-full md:w-48">
              <h3 className="font-medium text-gray-900">School Information</h3>
              <p className="text-sm text-gray-500 mt-1">Basic details about the school</p>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Delhi Public School"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="e.g., New Delhi"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.city ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Full address with street, landmark, etc."
                    rows="3"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="flex flex-col md:flex-row items-start gap-6 pt-6 border-t border-gray-200">
            <div className="w-full md:w-48">
              <h3 className="font-medium text-gray-900">Contact Information</h3>
              <p className="text-sm text-gray-500 mt-1">Primary contact person details</p>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="contactPersonName"
                  value={formData.contactPersonName}
                  onChange={handleInputChange}
                  placeholder="e.g., Mr. Ramesh Sharma"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.contactPersonName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.contactPersonName && (
                  <p className="mt-1 text-sm text-red-600">{errors.contactPersonName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    placeholder="10 digit number"
                    maxLength="10"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.mobile ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.mobile && (
                    <p className="mt-1 text-sm text-red-600">{errors.mobile}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="school@example.com"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="flex flex-col md:flex-row items-start gap-6 pt-6 border-t border-gray-200">
            <div className="w-full md:w-48">
              <h3 className="font-medium text-gray-900">Requirements</h3>
              <p className="text-sm text-gray-500 mt-1">Trainer requirements and status</p>
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trainers Required <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="trainersRequired"
                    value={formData.trainersRequired}
                    onChange={handleInputChange}
                    min="1"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.trainersRequired ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.trainersRequired && (
                    <p className="mt-1 text-sm text-red-600">{errors.trainersRequired}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Form Validation Summary */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    {Object.values(errors).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/schools')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              loading={loading}
              className="min-w-[120px]"
            >
              {id ? 'Update School' : 'Create School'}
            </Button>
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
              <li>• All fields marked with * are required</li>
              <li>• Mobile number must be exactly 10 digits</li>
              <li>• You can assign trainers after creating the school</li>
              <li>• Inactive schools cannot have trainers assigned</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSchool;