// pages/Invoices/InvoiceVerify.jsx (Fixed for your exact data structure)

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
  Card,
  CardContent,
  InputAdornment
} from '@mui/material';
import {
  ArrowBack,
  Save,
  CheckCircle,
  Edit,
  Cancel
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import invoiceService from '../../services/invoiceService';

const InvoiceVerify = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    tdsPercent: 0,
    gstPercent: 0,
    items: [],
    notes: ''
  });

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getInvoice(id);
      const invoiceData = response.data.data;
      
      console.log('Invoice Data:', invoiceData);
      
      // Calculate days in month
      const daysInMonth = new Date(invoiceData.year, invoiceData.month, 0).getDate();
      
      setInvoice({
        ...invoiceData,
        daysInMonth
      });
      
      // ✅ FIX: Extract employee ID correctly from the nested object
      const processedItems = invoiceData.items.map(item => {
        // Extract employee ID - it's in item.employee._id
        const employeeId = item.employee?._id || item.employee;
        
        // Extract employee name from basicInfo
        const employeeName = item.employeeName || item.employee?.basicInfo?.fullName || '';
        
        // Extract employee ID string
        const employeeIdString = item.employeeId || item.employee?.basicInfo?.employeeId || '';
        
        return {
          ...item,
          // Store the actual ObjectId for backend
          employeeObjectId: employeeId,
          employeeName: employeeName,
          employeeId: employeeIdString,
          monthlyBillingSalary: item.monthlyBillingSalary,
          leaveDays: item.leaveDays || 0,
          adjustedLeaveDays: item.leaveDays || 0,
          originalLeaveDays: item.leaveDays || 0,
          workingDays: item.workingDays || daysInMonth,
          actualWorkingDays: item.actualWorkingDays || daysInMonth
        };
      });
      
      console.log('Processed Items:', processedItems);
      
      setFormData({
        tdsPercent: invoiceData.tdsPercent || 0,
        gstPercent: invoiceData.gstPercent || 0,
        items: processedItems,
        notes: invoiceData.notes || ''
      });
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch invoice');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const calculateItemDetails = (item) => {
    const daysInMonth = invoice?.daysInMonth || 31;
    const monthlySalary = item.monthlyBillingSalary || 0;
    
    const dailyRate = monthlySalary / daysInMonth;
    const leaveDays = item.adjustedLeaveDays !== undefined ? item.adjustedLeaveDays : (item.leaveDays || 0);
    const leaveDeduction = Math.round(dailyRate * leaveDays);
    const netAmount = monthlySalary - leaveDeduction;
    const actualWorkingDays = daysInMonth - leaveDays;
    
    return {
      dailyRate: Math.round(dailyRate),
      leaveDays,
      leaveDeduction,
      actualWorkingDays,
      netAmount,
      daysInMonth
    };
  };

  const calculateTotals = () => {
    const totalBilling = formData.items.reduce((sum, item) => 
      sum + (item.monthlyBillingSalary || 0), 0
    );
    
    const totalLeaveDeduction = formData.items.reduce((sum, item) => {
      const details = calculateItemDetails(item);
      return sum + details.leaveDeduction;
    }, 0);
    
    const subtotal = totalBilling - totalLeaveDeduction;
    const tdsAmount = Math.round((subtotal * (formData.tdsPercent || 0)) / 100);
    const gstAmount = Math.round((subtotal * (formData.gstPercent || 0)) / 100);
    const grandTotal = subtotal - tdsAmount + gstAmount;
    
    return {
      totalBilling,
      totalLeaveDeduction,
      subtotal,
      tdsAmount,
      gstAmount,
      grandTotal
    };
  };

  const handleLeaveAdjustment = (index, value) => {
    const newItems = [...formData.items];
    const daysInMonth = invoice?.daysInMonth || 31;
    
    const leaveValue = parseInt(value) || 0;
    if (leaveValue >= 0 && leaveValue <= daysInMonth) {
      newItems[index].adjustedLeaveDays = leaveValue;
      setFormData({ ...formData, items: newItems });
    }
  };

  // ✅ FIX: Send CORRECT data structure with employee ID as string/ObjectId
  const handleSubmit = async () => {
    try {
      setSaving(true);
      
      // Prepare items with ALL required fields - EXACT format backend expects
      const verifyItems = formData.items.map(item => {
        // Get the employee ID from the stored objectId
        const employeeId = item.employeeObjectId || item.employee?._id || item.employee;
        
        // Log for debugging
        console.log('Processing item for submission:', {
          original: item,
          extractedEmployeeId: employeeId,
          employeeName: item.employeeName,
          employeeIdString: item.employeeId,
          monthlyBillingSalary: item.monthlyBillingSalary
        });
        
        return {
          employee: employeeId,                    // ✅ Should be "69940fbfbdabd7a5ad853e85"
          employeeName: item.employeeName,         // ✅ "kkkk Kumar"
          employeeId: item.employeeId,             // ✅ "EMP102"
          monthlyBillingSalary: item.monthlyBillingSalary, // ✅ 80000
          leaveDays: item.adjustedLeaveDays !== undefined ? item.adjustedLeaveDays : (item.leaveDays || 0)
        };
      });
      
      const verifyData = {
        tdsPercent: formData.tdsPercent || 0,
        gstPercent: formData.gstPercent || 0,
        items: verifyItems,
        notes: formData.notes || ''
      };
      
      // 🔍 FINAL DEBUG - See exactly what's being sent
      console.log('=== FINAL VERIFY DATA ===');
      console.log('Full verify data:', JSON.stringify(verifyData, null, 2));
      console.log('First item employee ID:', verifyData.items[0].employee);
      console.log('First item type:', typeof verifyData.items[0].employee);
      
      // Validate before sending
      let hasError = false;
      verifyData.items.forEach((item, index) => {
        if (!item.employee) {
          console.error(`❌ Missing employee for item ${index}`);
          hasError = true;
        }
        if (!item.employeeName) {
          console.error(`❌ Missing employeeName for item ${index}`);
          hasError = true;
        }
        if (!item.employeeId) {
          console.error(`❌ Missing employeeId for item ${index}`);
          hasError = true;
        }
        if (!item.monthlyBillingSalary) {
          console.error(`❌ Missing monthlyBillingSalary for item ${index}`);
          hasError = true;
        }
      });
      
      if (hasError) {
        toast.error('Missing required fields. Check console for details.');
        setSaving(false);
        return;
      }
      
      // Send to backend
      const response = await invoiceService.verifyInvoice(id, verifyData);
      console.log('Verify response:', response);
      
      toast.success('Invoice verified successfully');
      navigate(`/invoices/${id}`);
    } catch (error) {
      console.error('❌ Verification error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to verify invoice');
    } finally {
      setSaving(false);
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

  if (invoice.status !== 'Generated') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          This invoice cannot be verified. Current status: {invoice.status}
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

  const totals = calculateTotals();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(`/invoices/${id}`)}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">
          Verify Invoice {invoice.invoiceNumber}
        </Typography>
        <Chip label="Verification Mode" color="warning" icon={<Edit />} />
      </Box>

      <Grid container spacing={3}>
        {/* Left - Invoice Items */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Invoice Items (Adjust Leave Days)
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>Employee</TableCell>
                    <TableCell align="right">Monthly Rate</TableCell>
                    <TableCell align="center">Leave Days</TableCell>
                    <TableCell align="right">Leave Deduction</TableCell>
                    <TableCell align="center">Working Days</TableCell>
                    <TableCell align="right">Net Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.items.map((item, index) => {
                    const details = calculateItemDetails(item);
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {item.employeeName || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.employeeId || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" fontWeight="bold">
                          {formatCurrency(item.monthlyBillingSalary)}
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={details.leaveDays}
                            onChange={(e) => handleLeaveAdjustment(index, e.target.value)}
                            inputProps={{ 
                              min: 0, 
                              max: invoice.daysInMonth,
                              step: 1
                            }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          - {formatCurrency(details.leaveDeduction)}
                        </TableCell>
                        <TableCell align="center">
                          {details.actualWorkingDays}/{invoice.daysInMonth}
                        </TableCell>
                        <TableCell align="right" fontWeight="bold">
                          {formatCurrency(details.netAmount)}
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
                    Total Billing:
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(totals.totalBilling)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Total Leave Deduction:
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    - {formatCurrency(totals.totalLeaveDeduction)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal:
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
                placeholder="Add any notes about verification..."
              />
            </Box>
          </Paper>
        </Grid>

        {/* Right - Summary & Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Verification Summary
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
                    Total Billing:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" fontWeight="bold">
                    {formatCurrency(totals.totalBilling)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Less: Leave Deduction:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" sx={{ color: 'error.main' }}>
                    - {formatCurrency(totals.totalLeaveDeduction)}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body1" fontWeight="bold">
                    Subtotal:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1" align="right" fontWeight="bold">
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

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="h5" fontWeight="bold">
                    Grand Total:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h5" align="right" color="primary.main" fontWeight="bold">
                    {formatCurrency(totals.grandTotal)}
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
                color="success"
                startIcon={<Save />}
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? 'Verifying...' : 'Verify Invoice'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InvoiceVerify;