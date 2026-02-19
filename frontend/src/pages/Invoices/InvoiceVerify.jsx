// pages/Invoices/InvoiceVerify.jsx
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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

  // Keyboard shortcut (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, invoice]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getInvoice(id);
      const invoiceData = response.data.data;
      
      setInvoice(invoiceData);
      
      const processedItems = invoiceData.items.map(item => ({
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
      }));
      
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
    
    const dailyRate = workingDays > 0 ? monthlySalary / workingDays : 0;
    const leaveDays = item.adjustedLeaveDays !== undefined ? item.adjustedLeaveDays : (item.leaveDays || 0);
    const leaveDeduction = Math.round(dailyRate * leaveDays);
    const proratedAmount = monthlySalary - leaveDeduction;
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
    const previousDue = invoice?.previousDue || 0;
    const grandTotal = subtotal - tdsAmount + gstAmount + previousDue;
    
    return { subtotal, tdsAmount, gstAmount, previousDue, grandTotal };
  };

  const handleLeaveAdjustment = (index, value) => {
    const newItems = [...formData.items];
    const workingDays = formData.items[index].workingDays || getDaysInMonth();
    
    let leaveValue = parseInt(value) || 0;
    if (leaveValue < 0) leaveValue = 0;
    if (leaveValue > workingDays) {
      toast.error(`Leave days cannot exceed working days (${workingDays})`);
      leaveValue = workingDays;
    }
    
    newItems[index].adjustedLeaveDays = leaveValue;
    
    const monthlySalary = newItems[index].monthlyBillingSalary || 0;
    const dailyRate = workingDays > 0 ? monthlySalary / workingDays : 0;
    const newProratedAmount = monthlySalary - Math.round(dailyRate * leaveValue);
    
    newItems[index].proratedAmount = newProratedAmount;
    setFormData({ ...formData, items: newItems });
    setHasUnsavedChanges(true);
  };

  const resetRow = (index) => {
    const newItems = [...formData.items];
    newItems[index].adjustedLeaveDays = newItems[index].originalLeaveDays;
    newItems[index].proratedAmount = newItems[index].proratedAmount;
    setFormData({...formData, items: newItems});
    setHasUnsavedChanges(true);
  };

  const resetAllChanges = () => {
    const newItems = formData.items.map(item => ({
      ...item,
      adjustedLeaveDays: item.originalLeaveDays,
      proratedAmount: item.proratedAmount
    }));
    setFormData({...formData, items: newItems});
    setHasUnsavedChanges(true);
  };

  const handleSubmit = async () => {
    if (invoice?.status === 'Verified' && !formData.forceReVerify) {
      setReVerifyDialog(true);
      return;
    }
    await submitVerification();
  };

  const submitVerification = async () => {
    try {
      setSaving(true);
      
      const verifyItems = formData.items.map(item => ({
        employee: item.employeeObjectId || item.employee?._id || item.employee,
        employeeName: item.employeeName,
        employeeId: item.employeeId,
        monthlyBillingSalary: item.monthlyBillingSalary,
        leaveDays: item.adjustedLeaveDays !== undefined ? item.adjustedLeaveDays : (item.leaveDays || 0),
        reason: item.leaveDays !== item.adjustedLeaveDays ? 'Leave days adjusted during verification' : undefined
      }));
      
      const verifyData = {
        tdsPercent: Number(formData.tdsPercent) || 0,
        gstPercent: Number(formData.gstPercent) || 0,
        items: verifyItems,
        notes: formData.notes || '',
        forceReVerify: invoice?.status === 'Verified'
      };
      
      await invoiceService.verifyInvoice(id, verifyData);
      
      const message = invoice?.status === 'Verified' 
        ? 'Invoice re-verified successfully' 
        : 'Invoice verified successfully';
      
      toast.success(message);
      setHasUnsavedChanges(false);
      navigate(`/invoices/${id}`, { state: { verifySuccess: true, message } });
    } catch (error) {
      console.error('Verification error:', error);
      if (error.response?.data?.message?.includes('already verified')) {
        toast.error('Invoice is already verified. Use re-verify option.');
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
  const hasChanges = formData.items.some(item => item.leaveDays !== item.adjustedLeaveDays) ||
                    formData.tdsPercent !== invoice.tdsPercent ||
                    formData.gstPercent !== invoice.gstPercent;

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
        {invoice.verificationHistory?.length > 0 && (
          <Tooltip title={`Verified ${invoice.verificationHistory.length} time(s)`}>
            <Chip label={`v${invoice.verificationHistory.length}`} size="small" variant="outlined" />
          </Tooltip>
        )}
      </Box>

      {/* Warnings */}
      {isVerified && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<Warning />}>
          <Typography variant="body2">
            <strong>You are re-verifying an already verified invoice.</strong> Changes will create a new verification record.
          </Typography>
        </Alert>
      )}

      {/* Info Banner */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
        <Typography variant="body2">
          <strong>How calculation works:</strong> Monthly rate is for actual working days in the month ({daysInMonth} total days). 
          Daily rate = Monthly Rate ÷ Working Days. Leave deduction = Daily Rate × Leave Days.
        </Typography>
      </Alert>

      {/* Reset All Button */}
      {hasChanges && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" variant="outlined" startIcon={<History />} onClick={resetAllChanges}>
            Reset All Changes
          </Button>
        </Box>
      )}

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
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.items.map((item, index) => {
                    const details = calculateItemDetails(item);
                    const hasRowChanges = item.leaveDays !== item.adjustedLeaveDays;
                    
                    return (
                      <TableRow key={index} sx={hasRowChanges ? { bgcolor: 'warning.light', opacity: 0.9 } : {}}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">{item.employeeName || 'N/A'}</Typography>
                          <Typography variant="caption" color="text.secondary">ID: {item.employeeId || 'N/A'}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">{formatCurrency(item.monthlyBillingSalary)}</Typography>
                          <Typography variant="caption" color="text.secondary">For {details.workingDays} working days</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TextField
                              type="number"
                              size="small"
                              value={details.leaveDays}
                              onChange={(e) => handleLeaveAdjustment(index, e.target.value)}
                              inputProps={{ min: 0, max: details.workingDays, step: 0.5 }}
                              sx={{ width: 70 }}
                            />
                            {hasRowChanges && (
                              <Tooltip title="Reset to original">
                                <IconButton size="small" onClick={() => resetRow(index)}>
                                  <History fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          <Typography variant="body2">- {formatCurrency(details.leaveDeduction)}</Typography>
                          <Typography variant="caption">({details.leaveDays} days × {formatCurrency(details.dailyRate)}/day)</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={`${details.actualWorkingDays}/${details.workingDays}`} size="small"
                            color={details.leaveDays > 0 ? "warning" : "success"} />
                          <Typography variant="caption" display="block" color="text.secondary">of {daysInMonth} total</Typography>
                        </TableCell>
                        <TableCell align="right" fontWeight="bold" sx={{ color: 'primary.main' }}>
                          <Typography variant="body2" fontWeight="bold">{formatCurrency(details.proratedAmount)}</Typography>
                          <Typography variant="caption">= Monthly Rate - Leave Deduction</Typography>
                        </TableCell>
                        <TableCell align="center">
                          {hasRowChanges && <Chip label="Modified" size="small" color="warning" />}
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
                  <Typography variant="body2" color="text.secondary">Total Monthly Billing:</Typography>
                  <Typography variant="h6">{formatCurrency(formData.items.reduce((sum, item) => sum + (item.monthlyBillingSalary || 0), 0))}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Total Leave Deduction:</Typography>
                  <Typography variant="h6" color="error.main">
                    - {formatCurrency(formData.items.reduce((sum, item) => {
                      const details = calculateItemDetails(item);
                      return sum + details.leaveDeduction;
                    }, 0))}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Subtotal (Prorated):</Typography>
                  <Typography variant="h6" color="primary.main">{formatCurrency(totals.subtotal)}</Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Comparison with Original (for re-verify) */}
            {isVerified && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom color="info.contrastText">
                  📊 Changes from Original
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="info.contrastText">Original Subtotal:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="info.contrastText">
                      {formatCurrency(invoice.subtotal)}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="info.contrastText">New Subtotal:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="info.contrastText">
                      {formatCurrency(totals.subtotal)}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="info.contrastText">Difference:</Typography>
                    <Typography variant="body2" fontWeight="bold" 
                      color={totals.subtotal - invoice.subtotal >= 0 ? 'success.contrastText' : 'error.contrastText'}>
                      {totals.subtotal - invoice.subtotal >= 0 ? '+' : ''}
                      {formatCurrency(totals.subtotal - invoice.subtotal)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Notes */}
            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Verification Notes"
                value={formData.notes}
                onChange={(e) => {
                  setFormData({...formData, notes: e.target.value});
                  setHasUnsavedChanges(true);
                }}
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
                    onChange={(e) => {
                      setFormData({...formData, tdsPercent: parseFloat(e.target.value) || 0});
                      setHasUnsavedChanges(true);
                    }}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="GST Percent"
                    type="number"
                    value={formData.gstPercent}
                    onChange={(e) => {
                      setFormData({...formData, gstPercent: parseFloat(e.target.value) || 0});
                      setHasUnsavedChanges(true);
                    }}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    size="small"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Subtotal (Prorated):</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" fontWeight="bold">{formatCurrency(totals.subtotal)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">TDS ({formData.tdsPercent}%):</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" sx={{ color: 'error.main' }}>
                    - {formatCurrency(totals.tdsAmount)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">GST ({formData.gstPercent}%):</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" sx={{ color: 'success.main' }}>
                    + {formatCurrency(totals.gstAmount)}
                  </Typography>
                </Grid>
                {invoice.previousDue > 0 && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Previous Due:</Typography>
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
                  <Typography variant="h6" fontWeight="bold">Grand Total:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6" align="right" color="primary.main" fontWeight="bold">
                    {formatCurrency(totals.grandTotal)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
              <Button fullWidth variant="outlined" startIcon={<Cancel />} onClick={() => navigate(`/invoices/${id}`)}>
                Cancel
              </Button>
              <Button
                fullWidth
                variant="contained"
                color={isVerified ? "secondary" : "success"}
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? 'Processing...' : (isVerified ? 'Re-verify Invoice' : 'Verify Invoice')}
              </Button>
            </Box>

            {/* Keyboard shortcut hint */}
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Press <Chip size="small" label="Ctrl+S" variant="outlined" /> to save
              </Typography>
            </Box>
          </Paper>

          {/* Verification History Card */}
          {invoice.verificationHistory?.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>📋 Verification History</Typography>
                {invoice.verificationHistory.map((history, idx) => (
                  <Box key={idx} sx={{ mb: 2, pb: 1, borderBottom: idx < invoice.verificationHistory.length - 1 ? 1 : 0 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {format(new Date(history.verifiedAt), 'dd/MM/yyyy HH:mm')}
                    </Typography>
                    <Typography variant="body2">
                      <Chip label={history.status} size="small" 
                        color={history.status === 'Re-verified' ? 'secondary' : 'success'} sx={{ mr: 1 }} />
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
              <Typography variant="subtitle2" gutterBottom>📊 Calculation Formula</Typography>
              <Typography variant="caption" display="block">• Daily Rate = Monthly Rate ÷ Working Days</Typography>
              <Typography variant="caption" display="block">• Leave Deduction = Daily Rate × Leave Days</Typography>
              <Typography variant="caption" display="block">• Prorated Amount = Monthly Rate - Leave Deduction</Typography>
              <Typography variant="caption" color="text.secondary">* Working Days = Days employee was active</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Re-verify Confirmation Dialog */}
      <Dialog open={reVerifyDialog} onClose={() => setReVerifyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" />
            <Typography variant="h6">Re-verify Invoice?</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>This invoice is already verified. Are you sure you want to modify and re-verify it?</Typography>
          
          {/* Show changes summary */}
          {hasChanges && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">Changes to be made:</Typography>
              <ul style={{ marginTop: 4, marginBottom: 0 }}>
                {formData.tdsPercent !== invoice.tdsPercent && (
                  <li>TDS: {invoice.tdsPercent}% → {formData.tdsPercent}%</li>
                )}
                {formData.gstPercent !== invoice.gstPercent && (
                  <li>GST: {invoice.gstPercent}% → {formData.gstPercent}%</li>
                )}
                {formData.items.filter(item => item.leaveDays !== item.adjustedLeaveDays).map(item => (
                  <li key={item.employeeId}>
                    {item.employeeName}: Leave {item.leaveDays} → {item.adjustedLeaveDays}
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary">
            Changes will be tracked in verification history and a new record will be created.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReVerifyDialog(false)}>Cancel</Button>
          <Button onClick={() => {
            setFormData({...formData, forceReVerify: true});
            submitVerification();
          }} variant="contained" color="warning" autoFocus>
            Yes, Re-verify
          </Button>
        </DialogActions>
      </Dialog>
    </Box>  
  );
};

export default InvoiceVerify;