import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Filter, 
  Plus,
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Building2,
  Calendar,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const Invoice = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOutstanding: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    totalAmount: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    month: '',
    year: new Date().getFullYear().toString(),
    school: ''
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, [filters]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);
      if (filters.school) params.append('school', filters.school);
      
      const response = await api.get(`/invoices?${params.toString()}`);
      setInvoices(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch invoices');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/invoices/stats');
      setStats(response.data.data || {});
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleDownloadPDF = async (invoiceId) => {
    try {
      const response = await api.get(`/invoices/pdf/${invoiceId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'paid': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Paid' },
      'partial': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Partial' },
      'generated': { color: 'bg-blue-100 text-blue-800', icon: FileText, label: 'Generated' }
    };
    return badges[status] || { color: 'bg-gray-100 text-gray-800', icon: FileText, label: status };
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

  const getMonthName = (monthNumber) => {
    return months[monthNumber - 1] || 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage and generate school invoices
          </p>
        </div>
        <button
          onClick={() => navigate('/invoices/create')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-5 w-5 mr-2" />
          Generate Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats.totalOutstanding)}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid Invoices</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {stats.paidInvoices || 0}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {stats.pendingInvoices || 0}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats.totalAmount)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoice no., school..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="generated">Generated</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Months</option>
              {months.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => setFilters({
              search: '',
              status: '',
              month: '',
              year: currentYear.toString(),
              school: ''
            })}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gray-100 p-3 rounded-full">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-500 mb-6">Generate your first invoice for a school</p>
          <button
            onClick={() => navigate('/invoices/create')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Generate Invoice
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const StatusBadge = getStatusBadge(invoice.status);
            const StatusIcon = StatusBadge.icon;
            
            return (
              <div
                key={invoice._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                  {/* Left Section - Invoice Info */}
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>

                      {/* Invoice Details */}
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {invoice.invoiceNumber || 'INV-Pending'}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center ${StatusBadge.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {StatusBadge.label}
                          </span>
                        </div>

                        {/* School Info */}
                        <div className="mt-2 flex items-center text-sm text-gray-600">
                          <Building2 className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="font-medium">{invoice.school?.name || 'N/A'}</span>
                          <span className="mx-2">•</span>
                          <span>{invoice.school?.city || 'N/A'}</span>
                        </div>

                        {/* Month & Year */}
                        <div className="mt-1 flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          <span>{getMonthName(invoice.month)} {invoice.year}</span>
                        </div>

                        {/* Employee Count */}
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">{invoice.employees?.length || 0}</span> employees billed
                        </div>

                        {/* Amount Breakdown */}
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Subtotal</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(invoice.subtotal)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">GST (18%)</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(invoice.gstAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Previous Due</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(invoice.previousDue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Adjustment</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(invoice.adjustment)}
                            </p>
                          </div>
                        </div>

                        {/* Payment Status */}
                        <div className="mt-3 flex items-center space-x-4">
                          <div className="flex items-center text-sm">
                            <span className="text-gray-600">Grand Total:</span>
                            <span className="ml-1 text-lg font-bold text-gray-900">
                              {formatCurrency(invoice.grandTotal)}
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <span className="text-gray-600">Paid:</span>
                            <span className="ml-1 font-medium text-green-600">
                              {formatCurrency(invoice.paidAmount)}
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <span className="text-gray-600">Pending:</span>
                            <span className="ml-1 font-medium text-red-600">
                              {formatCurrency(invoice.pendingAmount)}
                            </span>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="mt-3 text-xs text-gray-500">
                          Generated on {formatDate(invoice.createdAt)}
                          {invoice.paymentHistory?.length > 0 && (
                            <> • Last payment: {formatDate(invoice.paymentHistory[invoice.paymentHistory.length - 1]?.date)}</>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="mt-4 lg:mt-0 lg:ml-6 flex lg:flex-col items-start lg:items-end gap-2">
                    <button
                      onClick={() => navigate(`/invoices/${invoice._id}`)}
                      className="inline-flex items-center px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(invoice._id)}
                      className="inline-flex items-center px-3 py-2 text-sm text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </button>
                  </div>
                </div>

                {/* Payment History */}
                {invoice.paymentHistory?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <details className="text-sm">
                      <summary className="text-blue-600 cursor-pointer hover:text-blue-800 font-medium">
                        View Payment History ({invoice.paymentHistory.length})
                      </summary>
                      <div className="mt-3 space-y-2">
                        {invoice.paymentHistory.map((payment, index) => (
                          <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded-md">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                              <span className="font-medium text-gray-900">
                                {formatCurrency(payment.amount)}
                              </span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(payment.date)}
                            </div>
                            {payment.note && (
                              <span className="text-gray-500 italic">"{payment.note}"</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            );
          })}

          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-900">
                  Total Invoices: {invoices.length}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-blue-700">
                  Generated: {invoices.filter(i => i.status === 'generated').length}
                </span>
                <span className="text-sm text-blue-700">
                  Partial: {invoices.filter(i => i.status === 'partial').length}
                </span>
                <span className="text-sm text-blue-700">
                  Paid: {invoices.filter(i => i.status === 'paid').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoice;