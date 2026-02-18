// pages/Invoices/InvoiceVerify.jsx - Add re-verify UI
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Edit,
  Cancel,
  Info,
  History,
  Warning
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import invoiceService from '../../services/invoiceService';

const InvoiceVerify = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reVerifyDialog, setReVerifyDialog] = useState(false);
  const [formData, setFormData] = useState({
    tdsPercent: 0,
    gstPercent: 0,
    items: [],
    notes: '',
    forceReVerify: false
  });

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getInvoice(id);
      const invoiceData = response.data.data;
      
      setInvoice(invoiceData);
      
      // Process items with correct field mapping
      const processedItems = invoiceData.items.map(item => {
        return {
          ...item,
          employeeObjectId: item.employee?._id || item.employee,
          employeeName: item.employeeName || item.employee?.basicInfo?.fullName || '',
          employeeId: item.employeeId || item.employee?.basicInfo?.employeeId || '',
          monthlyBillingSalary: item.monthlyBillingSalary || 0,
          leaveDays: item.leaveDays || 0,
          adjustedLeaveDays: item.leaveDays || 0,
          originalLeaveDays: item.leaveDays || 0,
          workingDays: item.workingDays || 0,
          proratedAmount: item.proratedAmount || 0
        };
      });
      
      setFormData({
        tdsPercent: invoiceData.tdsPercent || 0,
        gstPercent: invoiceData.gstPercent || 0,
        items: processedItems,
        notes: '',
        forceReVerify: false
      });
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch invoice');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    if (!invoice) return 30;
    return new Date(invoice.year, invoice.month, 0).getDate();
  };

  const calculateItemDetails = (item) => {
    const daysInMonth = getDaysInMonth();
    const monthlySalary = item.monthlyBillingSalary || 0;
    const workingDays = item.workingDays || daysInMonth;
    
    // Daily rate based on actual working days
    const dailyRate = workingDays > 0 ? monthlySalary / workingDays : 0;
    
    // Get leave days
    const leaveDays = item.adjustedLeaveDays !== undefined ? item.adjustedLeaveDays : (item.leaveDays || 0);
    
    // Calculate leave deduction
    const leaveDeduction = Math.round(dailyRate * leaveDays);
    
    // Prorated amount = monthly salary - leave deduction
    const proratedAmount = monthlySalary - leaveDeduction;
    
    // Actual working days after leave
    const actualWorkingDays = workingDays - leaveDays;
    
    return {
      dailyRate: Math.round(dailyRate),
      leaveDays,
      leaveDeduction,
      actualWorkingDays,
      workingDays,
      proratedAmount,
      monthlySalary,
      daysInMonth
    };
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      const details = calculateItemDetails(item);
      return sum + details.proratedAmount;
    }, 0);
    
    const tdsAmount = Math.round((subtotal * (formData.tdsPercent || 0)) / 100);
    const gstAmount = Math.round((subtotal * (formData.gstPercent || 0)) / 100);
    const grandTotal = subtotal - tdsAmount + gstAmount;
    
    return {
      subtotal,
      tdsAmount,
      gstAmount,
      grandTotal
    };
  };

  const handleLeaveAdjustment = (index, value) => {
    const newItems = [...formData.items];
    const workingDays = formData.items[index].workingDays || getDaysInMonth();
    
    const leaveValue = parseInt(value) || 0;
    if (leaveValue >= 0 && leaveValue <= workingDays) {
      newItems[index].adjustedLeaveDays = leaveValue;
      
      // Recalculate prorated amount
      const monthlySalary = newItems[index].monthlyBillingSalary || 0;
      const dailyRate = workingDays > 0 ? monthlySalary / workingDays : 0;
      const newProratedAmount = monthlySalary - Math.round(dailyRate * leaveValue);
      
      newItems[index].proratedAmount = newProratedAmount;
      
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleSubmit = async () => {
    // If invoice is already verified, show confirmation dialog
    if (invoice?.status === 'Verified' && !formData.forceReVerify) {
      setReVerifyDialog(true);
      return;
    }
    
    await submitVerification();
  };

  const submitVerification = async () => {
    try {
      setSaving(true);
      
      const verifyItems = formData.items.map(item => {
        return {
          employee: item.employeeObjectId || item.employee?._id || item.employee,
          employeeName: item.employeeName,
          employeeId: item.employeeId,
          monthlyBillingSalary: item.monthlyBillingSalary,
          leaveDays: item.adjustedLeaveDays !== undefined ? item.adjustedLeaveDays : (item.leaveDays || 0),
          reason: item.leaveDays !== item.adjustedLeaveDays ? 'Leave days adjusted during verification' : undefined
        };
      });
      
      const verifyData = {
        tdsPercent: Number(formData.tdsPercent) || 0,
        gstPercent: Number(formData.gstPercent) || 0,
        items: verifyItems,
        notes: formData.notes || '',
        forceReVerify: invoice?.status === 'Verified' // Send flag if re-verifying
      };
      
      const response = await invoiceService.verifyInvoice(id, verifyData);
      
      const message = invoice?.status === 'Verified' 
        ? 'Invoice re-verified successfully' 
        : 'Invoice verified successfully';
      
      toast.success(message);
      navigate(`/invoices/${id}`);
    } catch (error) {
      console.error('Verification error:', error);
      
      // Handle specific error for already verified invoices
      if (error.response?.data?.message?.includes('already verified')) {
        toast.error('Invoice is already verified. Use re-verify option to make changes.');
        setReVerifyDialog(true);
      } else {
        toast.error(error.response?.data?.message || 'Failed to verify invoice');
      }
    } finally {
      setSaving(false);
      setReVerifyDialog(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!invoice) return null;

  const isVerified = invoice.status === 'Verified';
  const totals = calculateTotals();
  const daysInMonth = getDaysInMonth();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(`/invoices/${id}`)}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">
          {isVerified ? 'Re-verify' : 'Verify'} Invoice {invoice.invoiceNumber}
        </Typography>
        <Chip 
          label={isVerified ? "Re-verification Mode" : "Verification Mode"} 
          color={isVerified ? "secondary" : "warning"} 
          icon={isVerified ? <History /> : <Edit />} 
        />
        
        {/* Show verification history count */}
        {invoice.verificationHistory?.length > 0 && (
          <Tooltip title={`Verified ${invoice.verificationHistory.length} time(s)`}>
            <Chip 
              label={`v${invoice.verificationHistory.length}`}
              size="small"
              variant="outlined"
            />
          </Tooltip>
        )}
      </Box>

      {/* Warning for re-verification */}
      {isVerified && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<Warning />}>
          <Typography variant="body2">
            <strong>You are re-verifying an already verified invoice.</strong> Changes made will create a new verification record.
          </Typography>
        </Alert>
      )}

      {/* Info Banner */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
        <Typography variant="body2">
          <strong>How calculation works:</strong> Monthly rate is for actual working days in the month ({daysInMonth} total days in {invoice.month}/{invoice.year}). 
          Daily rate = Monthly Rate ÷ Working Days. Leave deduction = Daily Rate × Leave Days.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Left - Invoice Items */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Invoice Items (Adjust Leave Days)
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>Employee</TableCell>
                    <TableCell align="right">Monthly Rate</TableCell>
                    <TableCell align="center">Leave Days</TableCell>
                    <TableCell align="right">Leave Deduction</TableCell>
                    <TableCell align="center">Working Days</TableCell>
                    <TableCell align="right">Prorated Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.items.map((item, index) => {
                    const details = calculateItemDetails(item);
                    const hasChanges = item.leaveDays !== item.adjustedLeaveDays;
                    
                    return (
                      <TableRow key={index} sx={hasChanges ? { bgcolor: 'warning.light', opacity: 0.9 } : {}}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {item.employeeName || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {item.employeeId || 'N/A'}
                          </Typography>
                          {hasChanges && (
                            <Chip 
                              label="Modified" 
                              size="small" 
                              color="warning" 
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(item.monthlyBillingSalary)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            For {details.workingDays} working days
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={details.leaveDays}
                            onChange={(e) => handleLeaveAdjustment(index, e.target.value)}
                            inputProps={{ 
                              min: 0, 
                              max: details.workingDays,
                              step: 0.5
                            }}
                            sx={{ width: 70 }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          <Typography variant="body2">
                            - {formatCurrency(details.leaveDeduction)}
                          </Typography>
                          <Typography variant="caption" display="block">
                            ({details.leaveDays} days × {formatCurrency(details.dailyRate)}/day)
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={`${details.actualWorkingDays}/${details.workingDays}`}
                            size="small"
                            color={details.leaveDays > 0 ? "warning" : "success"}
                          />
                          <Typography variant="caption" display="block" color="text.secondary">
                            of {daysInMonth} total days
                          </Typography>
                        </TableCell>
                        <TableCell align="right" fontWeight="bold" sx={{ color: 'primary.main' }}>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(details.proratedAmount)}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            = Monthly Rate - Leave Deduction
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary Row */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Total Monthly Billing:
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(formData.items.reduce((sum, item) => sum + (item.monthlyBillingSalary || 0), 0))}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Total Leave Deduction:
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    - {formatCurrency(formData.items.reduce((sum, item) => {
                      const details = calculateItemDetails(item);
                      return sum + details.leaveDeduction;
                    }, 0))}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal (Prorated):
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    {formatCurrency(totals.subtotal)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Verification Notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder={isVerified ? "Explain why you are re-verifying..." : "Add any notes about verification..."}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Right - Summary & Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {isVerified ? 'Re-verification Summary' : 'Verification Summary'}
            </Typography>

            <Box sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="TDS Percent"
                    type="number"
                    value={formData.tdsPercent}
                    onChange={(e) => setFormData({...formData, tdsPercent: parseFloat(e.target.value) || 0})}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>
                    }}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="GST Percent"
                    type="number"
                    value={formData.gstPercent}
                    onChange={(e) => setFormData({...formData, gstPercent: parseFloat(e.target.value) || 0})}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>
                    }}
                    size="small"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal (Prorated):
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" fontWeight="bold">
                    {formatCurrency(totals.subtotal)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    TDS ({formData.tdsPercent}%):
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" sx={{ color: 'error.main' }}>
                    - {formatCurrency(totals.tdsAmount)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    GST ({formData.gstPercent}%):
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" sx={{ color: 'success.main' }}>
                    + {formatCurrency(totals.gstAmount)}
                  </Typography>
                </Grid>

                {invoice.previousDue > 0 && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Previous Due:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" align="right" sx={{ color: 'warning.main' }}>
                        + {formatCurrency(invoice.previousDue)}
                      </Typography>
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="h6" fontWeight="bold">
                    Grand Total:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6" align="right" color="primary.main" fontWeight="bold">
                    {formatCurrency(totals.grandTotal + (invoice.previousDue || 0))}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => navigate(`/invoices/${id}`)}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                variant="contained"
                color={isVerified ? "secondary" : "success"}
                startIcon={<Save />}
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? 'Processing...' : (isVerified ? 'Re-verify Invoice' : 'Verify Invoice')}
              </Button>
            </Box>
          </Paper>

          {/* Verification History Card */}
          {invoice.verificationHistory?.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  📋 Verification History
                </Typography>
                {invoice.verificationHistory.map((history, idx) => (
                  <Box key={idx} sx={{ mb: 2, pb: 1, borderBottom: idx < invoice.verificationHistory.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {format(new Date(history.verifiedAt), 'dd/MM/yyyy HH:mm')}
                    </Typography>
                    <Typography variant="body2">
                      <Chip 
                        label={history.status} 
                        size="small" 
                        color={history.status === 'Re-verified' ? 'secondary' : 'success'}
                        sx={{ mr: 1 }}
                      />
                      by {history.verifiedBy?.name || 'Unknown'}
                    </Typography>
                    {history.changes?.length > 0 && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Changes: {history.changes.join(', ')}
                      </Typography>
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Calculation Info Card */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                📊 Calculation Formula
              </Typography>
              <Typography variant="caption" display="block" paragraph>
                <strong>Daily Rate</strong> = Monthly Rate ÷ Working Days
              </Typography>
              <Typography variant="caption" display="block" paragraph>
                <strong>Leave Deduction</strong> = Daily Rate × Leave Days
              </Typography>
              <Typography variant="caption" display="block" paragraph>
                <strong>Prorated Amount</strong> = Monthly Rate - Leave Deduction
              </Typography>
              <Typography variant="caption" color="text.secondary">
                * Working Days = Days employee was active in this month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Re-verify Confirmation Dialog */}
      <Dialog open={reVerifyDialog} onClose={() => setReVerifyDialog(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" />
            <Typography variant="h6">Re-verify Invoice?</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            This invoice is already verified. Are you sure you want to modify and re-verify it?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Changes will be tracked in verification history and a new verification record will be created.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReVerifyDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              setFormData({...formData, forceReVerify: true});
              submitVerification();
            }} 
            variant="contained" 
            color="warning"
            autoFocus
          >
            Yes, Re-verify
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvoiceVerify;