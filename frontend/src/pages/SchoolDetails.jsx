import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  User,
  Users,
  Edit,
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api.js";

const SchoolDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchSchoolDetails();
  }, [id]);

  const fetchSchoolDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/schools/${id}`);
      setSchool(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch school details");
      navigate("/schools");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!school) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/schools")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
            <p className="text-sm text-gray-600 mt-1">
              School Details & Information
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to={`/schools/edit/${school._id}`}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit School
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`rounded-lg p-4 ${
          school.status === "active"
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
        }`}
      >
        <div className="flex items-center">
          {school.status === "active" ? (
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600 mr-2" />
          )}
          <span
            className={`font-medium ${
              school.status === "active" ? "text-green-800" : "text-red-800"
            }`}
          >
            School is {school.status}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - School Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Basic Information
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">School Name</p>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {school.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">City</p>
                  <div className="flex items-center mt-1">
                    <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-base font-medium text-gray-900">
                      {school.city}
                    </p>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-base text-gray-900 mt-1">
                    {school.address}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Contact Information
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Contact Person</p>
                  <div className="flex items-center mt-1">
                    <User className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-base font-medium text-gray-900">
                      {school.contactPersonName}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mobile Number</p>
                  <div className="flex items-center mt-1">
                    <Phone className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-base font-medium text-gray-900">
                      {school.mobile}
                    </p>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Email Address</p>
                  <div className="flex items-center mt-1">
                    <Mail className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-base font-medium text-gray-900">
                      {school.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trainer Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Trainer Information
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Trainers Required</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {school.trainersRequired}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Current Trainers</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {school.trainersCount || 0}
                  </p>
                </div>
                <div
                  className={`p-4 rounded-lg ${
                    school.trainerStatus === "adequate"
                      ? "bg-green-50"
                      : school.trainerStatus === "shortage"
                        ? "bg-yellow-50"
                        : "bg-red-50"
                  }`}
                >
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="flex items-center mt-1">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        school.trainerStatus === "adequate"
                          ? "bg-green-100 text-green-800"
                          : school.trainerStatus === "shortage"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {school.trainerStatus}
                    </span>
                  </div>
                </div>
              </div>

              {school.trainerRequirementStatus?.needed > 0 && (
                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
                    <p className="text-sm text-amber-800">
                      Need{" "}
                      <span className="font-bold">
                        {school.trainerRequirementStatus.needed}
                      </span>{" "}
                      more trainer(s) to meet requirement
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current Trainers List */}
          {school.assignedTrainers?.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Assigned Trainers
                </h2>
              </div>

              <div className="divide-y divide-gray-200">
                {school.assignedTrainers.map((trainer) => (
                  <div key={trainer._id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-indigo-600" />
                        </div>

                        <div>
                          <p className="font-medium text-gray-900">
                            {trainer.basicInfo?.fullName || "N/A"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {trainer.basicInfo?.employeeId} •{" "}
                            {trainer.basicInfo?.designation}
                          </p>
                        </div>
                      </div>

                      <Link
                        to={`/employees/${trainer._id}`}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Additional Info */}
        <div className="space-y-6">
          {/* Logo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                School Logo
              </h2>
            </div>
            <div className="p-6 flex flex-col items-center">
              {school.logo?.url ? (
                <>
                  <img
                    src={school.logo.url}
                    alt={school.name}
                    className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <a
                    href={school.logo.url}
                    download
                    className="mt-4 inline-flex items-center px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Logo
                  </a>
                </>
              ) : (
                <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                  <p className="text-xs text-gray-500 mt-2">No logo uploaded</p>
                </div>
              )}
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                System Information
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Created By</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {school.createdBy?.name || "N/A"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(school.createdAt)}
                </p>
              </div>
              {school.updatedBy && (
                <div>
                  <p className="text-sm text-gray-500">Last Updated By</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {school.updatedBy?.name || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(school.updatedAt)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">School ID</p>
                <p className="text-xs font-mono text-gray-600 mt-1">
                  {school._id}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Quick Actions
              </h2>
            </div>
            <div className="p-6 space-y-3">
              <Link
                to="/postings/create"
                state={{ schoolId: school._id }}
                className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <span>Assign Trainer</span>
                <Users className="h-4 w-4" />
              </Link>
              <Link
                to="/invoices/create"
                state={{ schoolId: school._id }}
                className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <span>Generate Invoice</span>
                <Building2 className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetails;
