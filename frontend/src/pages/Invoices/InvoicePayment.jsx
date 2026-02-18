// pages/Invoices/InvoicePayment.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  InputAdornment,
  IconButton,
  FormHelperText,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  ArrowBack,
  Payment as PaymentIcon,
  Receipt,
  CheckCircle,
  Info
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import invoiceService from '../../services/invoiceService';

// Payment methods
const paymentMethods = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Online', label: 'Online (UPI/NetBanking)' },
  { value: 'DD', label: 'Demand Draft' }
];

// Payment status colors
const paymentStatusColors = {
  Unpaid: 'error',
  Partial: 'warning',
  Paid: 'success',
  Overdue: 'error'
};

const InvoicePayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: 'Bank Transfer',
    referenceNumber: '',
    bankName: '',
    branch: '',
    remarks: ''
  });
  const [errors, setErrors] = useState({});

  // Fetch invoice on load
  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getInvoice(id);
      const invoiceData = response.data.data;
      setInvoice(invoiceData);
      
      // Set default amount to due amount
      const dueAmount = invoiceData.grandTotal - (invoiceData.paidAmount || 0);
      setFormData(prev => ({
        ...prev,
        amount: dueAmount
      }));
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch invoice');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    
    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }
    
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }
    
    // Reference number required for certain payment methods
    if (['Cheque', 'Bank Transfer', 'Online', 'DD'].includes(formData.paymentMethod) && !formData.referenceNumber) {
      newErrors.referenceNumber = `${formData.paymentMethod === 'Cheque' ? 'Cheque' : 'Transaction'} number is required`;
    }
    
    // Bank name required for Cheque and DD
    if ((formData.paymentMethod === 'Cheque' || formData.paymentMethod === 'DD') && !formData.bankName) {
      newErrors.bankName = 'Bank name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill all required fields');
      return;
    }

    const dueAmount = invoice.grandTotal - (invoice.paidAmount || 0);
    if (formData.amount > dueAmount) {
      toast.error(`Amount cannot exceed due amount of ${formatCurrency(dueAmount)}`);
      return;
    }

    if (formData.amount < 0) {
      toast.error('Amount cannot be negative');
      return;
    }

    try {
      setSaving(true);
      
      const paymentData = {
        ...formData,
        amount: Number(formData.amount)
      };
      
      const response = await invoiceService.recordPayment(id, paymentData);
      
      toast.success(response.data.message || 'Payment recorded successfully');
      
      // Move to success step
      setActiveStep(1);
      
      // Refresh invoice data
      fetchInvoice();
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Get due amount
  const getDueAmount = () => {
    if (!invoice) return 0;
    return invoice.grandTotal - (invoice.paidAmount || 0);
  };

  // Get payment progress percentage
  const getPaymentProgress = () => {
    if (!invoice) return 0;
    const paid = invoice.paidAmount || 0;
    const total = invoice.grandTotal;
    return Math.round((paid / total) * 100);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Invoice not found</Alert>
        <Button
          sx={{ mt: 2 }}
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/invoices')}
        >
          Back to Invoices
        </Button>
      </Box>
    );
  }

  const dueAmount = getDueAmount();
  const progress = getPaymentProgress();

  // If invoice is already paid
  if (invoice.paymentStatus === 'Paid') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="success" icon={<CheckCircle />}>
          This invoice is already fully paid.
        </Alert>
        <Button
          sx={{ mt: 2 }}
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/invoices/${id}`)}
        >
          Back to Invoice
        </Button>
      </Box>
    );
  }

  // Steps for stepper
  const steps = [
    {
      label: 'Enter Payment Details',
      description: 'Fill in the payment information'
    },
    {
      label: 'Payment Recorded',
      description: 'Payment has been successfully recorded'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(`/invoices/${id}`)}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">
          Record Payment - {invoice.invoiceNumber}
        </Typography>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column - Payment Form */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            {/* Stepper */}
            <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 3 }}>
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel>
                    <Typography variant="subtitle1">{step.label}</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {step.description}
                    </Typography>
                  </StepContent>
                </Step>
              ))}
            </Stepper>

            {activeStep === 0 ? (
              /* Payment Form */
              <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  {/* Amount */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="Payment Amount"
                      name="amount"
                      type="number"
                      value={formData.amount}
                      onChange={handleChange}
                      error={!!errors.amount}
                      helperText={errors.amount}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        inputProps: { min: 0, step: 1 }
                      }}
                    />
                    <FormHelperText>
                      Maximum due: {formatCurrency(dueAmount)}
                    </FormHelperText>
                  </Grid>

                  {/* Payment Date */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="Payment Date"
                      name="paymentDate"
                      type="date"
                      value={formData.paymentDate}
                      onChange={handleChange}
                      error={!!errors.paymentDate}
                      helperText={errors.paymentDate}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{
                        max: format(new Date(), 'yyyy-MM-dd')
                      }}
                    />
                  </Grid>

                  {/* Payment Method */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      select
                      label="Payment Method"
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleChange}
                      error={!!errors.paymentMethod}
                      helperText={errors.paymentMethod}
                    >
                      {paymentMethods.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  {/* Reference Number */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Reference Number"
                      name="referenceNumber"
                      value={formData.referenceNumber}
                      onChange={handleChange}
                      placeholder={
                        formData.paymentMethod === 'Cheque' ? 'Cheque Number' :
                        formData.paymentMethod === 'DD' ? 'DD Number' :
                        'Transaction/UPI ID'
                      }
                      error={!!errors.referenceNumber}
                      helperText={errors.referenceNumber}
                    />
                  </Grid>

                  {/* Bank Details (conditional) */}
                  {(formData.paymentMethod === 'Cheque' || formData.paymentMethod === 'Bank Transfer' || formData.paymentMethod === 'DD') && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Bank Name"
                          name="bankName"
                          value={formData.bankName}
                          onChange={handleChange}
                          error={!!errors.bankName}
                          helperText={errors.bankName}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Branch"
                          name="branch"
                          value={formData.branch}
                          onChange={handleChange}
                        />
                      </Grid>
                    </>
                  )}

                  {/* Remarks */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Remarks"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleChange}
                      placeholder="Any additional notes about this payment"
                    />
                  </Grid>

                  {/* Submit Buttons */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => navigate(`/invoices/${id}`)}
                      >
                        Cancel
                      </Button>
                      <Button
                        fullWidth
                        type="submit"
                        variant="contained"
                        color="primary"
                        startIcon={<PaymentIcon />}
                        disabled={saving}
                      >
                        {saving ? 'Recording...' : 'Record Payment'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            ) : (
              /* Success Message */
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Payment Recorded Successfully!
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Amount: {formatCurrency(formData.amount)}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Payment has been recorded and receipt will be sent to {invoice.schoolDetails?.email}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate(`/invoices/${id}`)}
                  sx={{ mt: 2 }}
                >
                  View Invoice
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Column - Invoice Summary */}
        <Grid item xs={12} md={5}>
          {/* Invoice Summary Card */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Invoice Summary
              </Typography>

              {/* Progress Bar */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Progress
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {progress}%
                  </Typography>
                </Box>
                <Box sx={{ 
                  width: '100%', 
                  height: 8, 
                  bgcolor: 'grey.200', 
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <Box sx={{ 
                    width: `${progress}%`, 
                    height: '100%', 
                    bgcolor: progress === 100 ? 'success.main' : 'primary.main',
                    transition: 'width 0.3s'
                  }} />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Invoice Details */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Invoice Number:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" fontWeight="bold">
                    {invoice.invoiceNumber}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    School:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">
                    {invoice.school?.name}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Period:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">
                    {invoice.month}/{invoice.year}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body1" fontWeight="bold">
                    Invoice Total:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1" align="right" fontWeight="bold">
                    {formatCurrency(invoice.grandTotal)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Already Paid:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" color="success.main" fontWeight="bold">
                    {formatCurrency(invoice.paidAmount || 0)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="h6">
                    Due Amount:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6" align="right" color="error.main" fontWeight="bold">
                    {formatCurrency(dueAmount)}
                  </Typography>
                </Grid>

                {invoice.paidAt && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Last Payment:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" align="right">
                        {format(new Date(invoice.paidAt), 'dd/MM/yyyy')}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>

              {/* Employee Breakdown */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Employee Breakdown
                </Typography>
                {invoice.items.map((item, idx) => (
                  <Box key={idx} sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '0.875rem',
                    py: 0.5,
                    borderBottom: idx < invoice.items.length - 1 ? '1px dashed' : 'none',
                    borderColor: 'grey.200'
                  }}>
                    <Typography variant="caption">
                      {item.employeeName}
                    </Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {formatCurrency(item.proratedAmount)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Receipt Info Card */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Receipt color="primary" />
                <Typography variant="subtitle2">
                  Receipt Information
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                • A payment receipt will be generated automatically
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                • Receipt will be sent to: {invoice.schoolDetails?.email || 'No email on record'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                • Payment will be reflected in school ledger
              </Typography>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card sx={{ mt: 2, bgcolor: 'info.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Info color="info" />
                <Typography variant="subtitle2" color="info.contrastText">
                  Payment Instructions
                </Typography>
              </Box>
              <Typography variant="caption" color="info.contrastText" sx={{ mt: 1, display: 'block' }}>
                • Enter the amount you received from the school
              </Typography>
              <Typography variant="caption" color="info.contrastText" display="block">
                • For partial payments, you can record remaining later
              </Typography>
              <Typography variant="caption" color="info.contrastText" display="block">
                • Reference number helps in tracking (Cheque/Transaction ID)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InvoicePayment;