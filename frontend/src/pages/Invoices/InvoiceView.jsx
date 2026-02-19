// pages/Invoices/InvoiceView.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AlertTitle,
  TextField,
} from "@mui/material";
import {
  ArrowBack,
  CheckCircle,
  Payment,
  GetApp,
  Edit,
  Info,
  Warning,
  History,
  Send,
  Cancel,
  AccountBalance,
  Receipt as ReceiptIcon,
  Money,
} from "@mui/icons-material";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import invoiceService from "../../services/invoiceService";

const statusColors = {
  Draft: "default",
  Generated: "info",
  Verified: "success",
  Sent: "primary",
  Paid: "success",
  Cancelled: "error",
};

const paymentStatusColors = {
  Unpaid: "error",
  Partial: "warning",
  Paid: "success",
  Overdue: "error",
};

// Helper function for payment icons
const getPaymentIcon = (method) => {
  switch(method?.toLowerCase()) {
    case 'cash': return <Money fontSize="small" />;
    case 'cheque': return <ReceiptIcon fontSize="small" />;
    case 'bank transfer': return <AccountBalance fontSize="small" />;
    case 'online': return <Payment fontSize="small" />;
    default: return <Payment fontSize="small" />;
  }
};

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reVerifyDialog, setReVerifyDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [resendDialog, setResendDialog] = useState(false);
  const [resendReason, setResendReason] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  useEffect(() => {
    if (location.state?.verifySuccess) {
      toast.success(location.state.message || "Invoice verified successfully");
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getInvoice(id);
      setInvoice(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch invoice");
      navigate("/invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await invoiceService.downloadInvoice(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Failed to download invoice");
    }
  };

  const handleReVerify = () => {
    navigate(`/invoices/${id}/verify`, {
      state: {
        isReVerify: true,
        fromSent: invoice.status === "Sent",
      },
    });
  };

  const handleResend = async () => {
    // Check if email exists
    const schoolEmail = invoice?.schoolDetails?.email || invoice?.school?.email;
    if (!schoolEmail) {
      toast.error("School email not found. Cannot send invoice.");
      setResendDialog(false);
      return;
    }

    try {
      setSending(true);

      const resendData = {
        reason:
          resendReason ||
          (invoice.status === "Verified"
            ? "First time sending"
            : "Resending to school"),
        regeneratePDF: true,
      };

      let response;

      if (invoice.status === "Verified") {
        response = await invoiceService.sendBulk([id], resendData.reason);
      } else {
        response = await invoiceService.resendInvoice(id, resendData);
      }

      toast.success(response.data.message || "Invoice sent successfully");
      setResendDialog(false);
      setResendReason("");
      fetchInvoice();
    } catch (error) {
      console.error("Send error:", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to send invoice",
      );
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async () => {
    try {
      setLoading(true);
      await invoiceService.cancelInvoice(id, "Cancelled by admin");
      toast.success("Invoice cancelled successfully");
      fetchInvoice();
    } catch (error) {
      toast.error("Failed to cancel invoice");
    } finally {
      setLoading(false);
      setCancelDialog(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getDaysInMonth = () => {
    if (!invoice) return 30;
    return new Date(invoice.year, invoice.month, 0).getDate();
  };

  const canVerify = () => {
    return invoice?.status === "Generated";
  };

  const canReVerify = () => {
    return ["Verified", "Sent"].includes(invoice?.status);
  };

  const canSend = () => {
    return invoice?.status === "Verified";
  };

  const canResend = () => {
    return invoice?.status === "Sent";
  };

  const canCancel = () => {
    return !["Paid", "Cancelled"].includes(invoice?.status);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Invoice not found</Alert>
      </Box>
    );
  }

  const daysInMonth = getDaysInMonth();
  const dueAmount = invoice.grandTotal - (invoice.paidAmount || 0);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <IconButton onClick={() => navigate("/invoices")}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4">Invoice {invoice.invoiceNumber}</Typography>
          <Chip
            label={invoice.status}
            color={statusColors[invoice.status]}
            size="small"
          />
          <Chip
            label={invoice.paymentStatus}
            color={paymentStatusColors[invoice.paymentStatus]}
            size="small"
          />

          {invoice.verificationHistory?.length > 0 && (
            <Tooltip title={`Verified ${invoice.verificationHistory.length} time(s)`}>
              <Chip
                icon={<History />}
                label={`v${invoice.verificationHistory.length}`}
                size="small"
                variant="outlined"
              />
            </Tooltip>
          )}

          {invoice.resendHistory?.length > 0 && (
            <Tooltip title={`Resent ${invoice.resendHistory.length} time(s)`}>
              <Chip
                icon={<Send />}
                label={`r${invoice.resendHistory.length}`}
                size="small"
                variant="outlined"
                color="info"
              />
            </Tooltip>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {invoice.status === "Generated" && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => navigate(`/invoices/${id}/verify`)}
            >
              Verify Invoice
            </Button>
          )}

          {invoice.status === "Verified" && (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Send />}
                onClick={() => setResendDialog(true)}
              >
                Send to School
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<Edit />}
                onClick={handleReVerify}
              >
                Re-verify
              </Button>
            </>
          )}

          {invoice.status === "Sent" && (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Send />}
                onClick={() => setResendDialog(true)}
              >
                Resend
              </Button>
              <Tooltip title="Warning: This will modify a sent invoice">
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Edit />}
                  onClick={() => setReVerifyDialog(true)}
                >
                  Re-verify
                </Button>
              </Tooltip>
              {invoice.paymentStatus !== "Paid" && (
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<Payment />}
                  onClick={() => navigate(`/invoices/${id}/payment`)}
                >
                  {invoice.paymentStatus === "Partial"
                    ? "Add Remaining Payment"
                    : "Record Payment"}
                </Button>
              )}
            </>
          )}

          {canCancel() && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
              onClick={() => setCancelDialog(true)}
            >
              Cancel Invoice
            </Button>
          )}

          <Button
            variant="outlined"
            startIcon={<GetApp />}
            onClick={handleDownload}
          >
            Download PDF
          </Button>
        </Box>
      </Box>

      {/* Warning for sent invoice */}
      {invoice.status === "Sent" && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<Warning />}>
          <AlertTitle>This invoice has been sent to the school</AlertTitle>
          <Typography variant="body2">
            Any modifications will require re-sending. Consider creating a
            credit note for corrections instead of modifying.
          </Typography>
        </Alert>
      )}

      {/* School Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          School Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              School Name
            </Typography>
            <Typography variant="body1" gutterBottom>
              {invoice.school?.name}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Address
            </Typography>
            <Typography variant="body1" gutterBottom>
              {invoice.schoolDetails?.address}, {invoice.schoolDetails?.city}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Contact Person
            </Typography>
            <Typography variant="body1" gutterBottom>
              {invoice.schoolDetails?.contactPersonName}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Email / Mobile
            </Typography>
            <Typography variant="body1" gutterBottom>
              {invoice.schoolDetails?.email} | {invoice.schoolDetails?.mobile}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Invoice Period Info */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
        <Typography variant="body2">
          <strong>Billing Period:</strong> {invoice.month}/{invoice.year} (
          {daysInMonth} total days in month)
          {invoice.sentAt && (
            <>
              {" "}• <strong>Sent on:</strong>{" "}
              {format(new Date(invoice.sentAt), "dd/MM/yyyy HH:mm")}
            </>
          )}
        </Typography>
      </Alert>

      {/* Invoice Items */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Invoice Items
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell>Sr No.</TableCell>
                <TableCell>Employee Name</TableCell>
                <TableCell>Employee ID</TableCell>
                <TableCell align="right">Monthly Rate</TableCell>
                <TableCell align="center">Leave Days</TableCell>
                <TableCell align="right">Leave Deduction</TableCell>
                <TableCell align="center">Working Days</TableCell>
                <TableCell align="right">Prorated Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.items.map((item, index) => {
                const dailyRate =
                  item.workingDays > 0
                    ? item.monthlyBillingSalary / item.workingDays
                    : 0;
                const leaveDeduction = Math.round(
                  dailyRate * (item.leaveDays || 0),
                );

                return (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.employeeName}</TableCell>
                    <TableCell>{item.employeeId}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(item.monthlyBillingSalary)}
                      <Typography variant="caption" display="block" color="text.secondary">
                        for {item.workingDays} working days
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={item.leaveDays}
                        size="small"
                        color={item.leaveDays > 0 ? "warning" : "success"}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ color: "error.main" }}>
                      {item.leaveDays > 0
                        ? `- ${formatCurrency(leaveDeduction)}`
                        : "-"}
                      <Typography variant="caption" display="block">
                        {item.leaveDays > 0
                          ? `${item.leaveDays} days × ${formatCurrency(Math.round(dailyRate))}/day`
                          : ""}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {item.actualWorkingDays || item.workingDays - item.leaveDays}
                      /{item.workingDays}
                      <Typography variant="caption" display="block" color="text.secondary">
                        of {daysInMonth} total
                      </Typography>
                    </TableCell>
                    <TableCell align="right" fontWeight="bold">
                      {formatCurrency(item.proratedAmount)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Subtotal Row */}
        <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
          <Grid container justifyContent="flex-end">
            <Grid item xs={4}>
              <Typography variant="subtitle1" fontWeight="bold">
                Subtotal (Prorated):
              </Typography>
            </Grid>
            <Grid item xs={2}>
              <Typography variant="subtitle1" fontWeight="bold" align="right">
                {formatCurrency(invoice.subtotal)}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Summary Grid */}
      <Grid container spacing={3}>
        {/* Step-by-Step Calculation */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Invoice Calculation Breakdown
              </Typography>
              <Box sx={{ mt: 3 }}>
                {/* Step 1: Subtotal */}
                <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar sx={{ bgcolor: "primary.main", width: 28, height: 28, fontSize: "0.875rem" }}>1</Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography variant="subtitle1" fontWeight="medium">Calculate Subtotal</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2">Total of all items:</Typography>
                        <Typography variant="h6" color="primary">{formatCurrency(invoice.subtotal)}</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Step 2: TDS */}
                <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar sx={{ bgcolor: "primary.main", width: 28, height: 28, fontSize: "0.875rem" }}>2</Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography variant="subtitle1" fontWeight="medium">Apply TDS</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2">{invoice.tdsPercent}% of {formatCurrency(invoice.subtotal)}:</Typography>
                        <Typography variant="h6" color="error">- {formatCurrency(invoice.tdsAmount)}</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Step 3: GST */}
                <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar sx={{ bgcolor: "primary.main", width: 28, height: 28, fontSize: "0.875rem" }}>3</Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography variant="subtitle1" fontWeight="medium">Add GST</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2">{invoice.gstPercent}% of (Subtotal - TDS):</Typography>
                        <Typography variant="h6" color="success.main">+ {formatCurrency(invoice.gstAmount)}</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Step 4: Previous Due */}
                {invoice.previousDue > 0 && (
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
                    <Grid container alignItems="center" spacing={2}>
                      <Grid item xs={12} sm={1}>
                        <Avatar sx={{ bgcolor: "warning.main", width: 28, height: 28, fontSize: "0.875rem" }}>4</Avatar>
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        <Typography variant="subtitle1" fontWeight="medium">Add Previous Due</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Previous due amount:</Typography>
                          <Typography variant="h6" color="warning.main">+ {formatCurrency(invoice.previousDue)}</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                )}

                {/* Step 5: Round Off */}
                <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar sx={{ bgcolor: invoice.roundOff >= 0 ? "success.main" : "error.main", width: 28, height: 28, fontSize: "0.875rem" }}>5</Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography variant="subtitle1" fontWeight="medium">Round Off Adjustment</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2">Round off adjustment:</Typography>
                        <Typography variant="h6" color={invoice.roundOff >= 0 ? "success.main" : "error.main"}>
                          {invoice.roundOff >= 0 ? "+" : ""}{formatCurrency(invoice.roundOff)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Final Total */}
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "primary.light", border: "2px solid", borderColor: "primary.main" }}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar sx={{ bgcolor: "success.main", width: 28, height: 28, fontSize: "0.875rem" }}>✓</Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography variant="h6" fontWeight="bold" color="primary.dark">Final Amount</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="h5" fontWeight="bold" color="primary.dark">GRAND TOTAL:</Typography>
                        <Typography variant="h4" fontWeight="bold" color="primary.dark">
                          {formatCurrency(invoice.grandTotal)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                💰 Payment Details
              </Typography>

              {/* Payment Progress Bar */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Payment Progress</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {invoice.paidAmount ? Math.round((invoice.paidAmount / invoice.grandTotal) * 100) : 0}%
                  </Typography>
                </Box>
                <Box sx={{ width: "100%", height: 8, bgcolor: "grey.200", borderRadius: 4, overflow: "hidden" }}>
                  <Box sx={{
                    width: `${invoice.paidAmount ? (invoice.paidAmount / invoice.grandTotal) * 100 : 0}%`,
                    height: "100%",
                    bgcolor: invoice.paymentStatus === "Paid" ? "success.main" : 
                            invoice.paymentStatus === "Partial" ? "warning.main" : "error.main",
                    transition: "width 0.3s",
                  }} />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Payment Summary */}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">Payment Status:</Typography>
                    <Chip label={invoice.paymentStatus} size="small" color={paymentStatusColors[invoice.paymentStatus]} />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Invoice Total:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" fontWeight="bold">{formatCurrency(invoice.grandTotal)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Paid Amount:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" color="success.main" fontWeight="bold">
                    {formatCurrency(invoice.paidAmount || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Due Amount:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" color="error" fontWeight="bold">
                    {formatCurrency(dueAmount)}
                  </Typography>
                </Grid>
                {invoice.paidAt && (
                  <>
                    <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Last Payment:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" align="right">
                        {format(new Date(invoice.paidAt), "dd/MM/yyyy")}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>

              {/* Payment History */}
              {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>Payment History</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "grey.50" }}>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Reference</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoice.paymentHistory.map((payment, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {format(new Date(payment.paymentDate || payment.recordedAt || payment.date), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell align="right" fontWeight="bold">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {getPaymentIcon(payment.paymentMethod || payment.method)}
                                {payment.paymentMethod || payment.method}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={payment.referenceNumber || payment.reference || "No reference"}>
                                <span style={{ fontFamily: 'monospace' }}>
                                  {(payment.referenceNumber || payment.reference)
                                    ? (payment.referenceNumber || payment.reference).substring(0, 8) + "..."
                                    : "-"}
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Total Paid Summary */}
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Grid container spacing={1}>
                      <Grid item xs={8}>
                        <Typography variant="body2" color="success.contrastText">Total Payments Received:</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" align="right" fontWeight="bold" color="success.contrastText">
                          {formatCurrency(invoice.paidAmount || 0)}
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="body2" color="success.contrastText">Number of Payments:</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" align="right" fontWeight="bold" color="success.contrastText">
                          {invoice.paymentHistory.length}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              )}

              {(!invoice.paymentHistory || invoice.paymentHistory.length === 0) && (
                <Box sx={{ mt: 2, textAlign: 'center', py: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">No payment history available</Typography>
                </Box>
              )}

              {/* Quick Action Buttons */}
              {dueAmount > 0 && (
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="warning"
                    size="small"
                    startIcon={<Payment />}
                    onClick={() => navigate(`/invoices/${id}/payment`)}
                  >
                    Record Full Payment
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={() => navigate(`/invoices/${id}/payment`)}
                  >
                    Partial
                  </Button>
                </Box>
              )}

              {/* Payment Instructions */}
              <Box sx={{ mt: 2, p: 2, bgcolor: "info.light", borderRadius: 1 }}>
                <Typography variant="caption" color="info.contrastText" display="block">
                  💡 <strong>Note:</strong> Payment can be made via Cash, Cheque, or Bank Transfer.
                </Typography>
                {dueAmount > 0 && (
                  <Typography variant="caption" color="info.contrastText" display="block" sx={{ mt: 0.5 }}>
                    Due amount of {formatCurrency(dueAmount)} is pending.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Tax Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Tax Details
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">TDS Rate:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" fontWeight="bold">{invoice.tdsPercent}%</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">TDS Amount:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" color="error" fontWeight="bold">
                    - {formatCurrency(invoice.tdsAmount)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">GST Rate:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" fontWeight="bold">{invoice.gstPercent}%</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">GST Amount:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" color="success.main" fontWeight="bold">
                    + {formatCurrency(invoice.gstAmount)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" fontWeight="bold">Net Tax Effect:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" fontWeight="bold" 
                    color={invoice.gstAmount - invoice.tdsAmount >= 0 ? "success.main" : "error.main"}>
                    {invoice.gstAmount - invoice.tdsAmount >= 0 ? "+" : ""}
                    {formatCurrency(invoice.gstAmount - invoice.tdsAmount)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      <strong>Calculation:</strong> Subtotal ({formatCurrency(invoice.subtotal)})
                      {invoice.tdsPercent > 0 ? ` - TDS ${invoice.tdsPercent}% (${formatCurrency(invoice.tdsAmount)})` : ""}
                      {invoice.gstPercent > 0 ? ` + GST ${invoice.gstPercent}% (${formatCurrency(invoice.gstAmount)})` : ""}
                      {invoice.previousDue > 0 ? ` + Previous Due (${formatCurrency(invoice.previousDue)})` : ""}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Customizations */}
        {invoice.customizations?.leaveAdjustments?.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="warning.main">🔧 Customizations Applied</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>Original Leave</TableCell>
                        <TableCell>Adjusted Leave</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Adjusted By</TableCell>
                        <TableCell>Adjusted At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.customizations.leaveAdjustments.map((adj, index) => (
                        <TableRow key={index}>
                          <TableCell>{adj.employee?.basicInfo?.fullName || adj.employeeName || "N/A"}</TableCell>
                          <TableCell>{adj.originalLeaveDays}</TableCell>
                          <TableCell>{adj.adjustedLeaveDays}</TableCell>
                          <TableCell>{adj.reason}</TableCell>
                          <TableCell>{adj.adjustedBy?.name || "Admin"}</TableCell>
                          <TableCell>{format(new Date(adj.adjustedAt), "dd/MM/yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Verification History */}
        {invoice.verificationHistory?.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>📜 Verification History</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Verified By</TableCell>
                        <TableCell>Changes</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.verificationHistory.map((history, index) => (
                        <TableRow key={index}>
                          <TableCell>{format(new Date(history.verifiedAt), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell>
                            <Chip label={history.status} size="small" 
                              color={history.status === "Re-verified" ? "secondary" : "success"} />
                          </TableCell>
                          <TableCell>{history.verifiedBy?.name || "System"}</TableCell>
                          <TableCell>
                            {history.changes?.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: 16 }}>
                                {history.changes.map((change, idx) => (
                                  <li key={idx}><Typography variant="caption">{change}</Typography></li>
                                ))}
                              </ul>
                            ) : "No changes"}
                          </TableCell>
                          <TableCell><Typography variant="caption">{history.notes || "-"}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Resend History */}
        {invoice.resendHistory?.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>📤 Resend History</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Resent By</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Previous Sent</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.resendHistory.map((history, index) => (
                        <TableRow key={index}>
                          <TableCell>{format(new Date(history.resentAt), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell>{history.resentBy?.name || "Admin"}</TableCell>
                          <TableCell>{history.reason || "Resent"}</TableCell>
                          <TableCell>
                            {history.previousSentAt
                              ? format(new Date(history.previousSentAt), "dd/MM/yyyy HH:mm")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Notes */}
        {invoice.notes && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>📝 Notes</Typography>
                <Typography variant="body2" style={{ whiteSpace: "pre-line" }}>{invoice.notes}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Timeline */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>📅 Timeline</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="text.secondary">Generated:</Typography>
                  <Typography variant="body2">{format(new Date(invoice.generatedAt), "dd/MM/yyyy HH:mm")}</Typography>
                  <Typography variant="caption" color="text.secondary">by {invoice.generatedBy?.name || "System"}</Typography>
                </Grid>
                {invoice.verifiedAt && (
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">Last Verified:</Typography>
                    <Typography variant="body2">{format(new Date(invoice.verifiedAt), "dd/MM/yyyy HH:mm")}</Typography>
                    <Typography variant="caption" color="text.secondary">by {invoice.verifiedBy?.name}</Typography>
                  </Grid>
                )}
                {invoice.sentAt && (
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">Sent:</Typography>
                    <Typography variant="body2">{format(new Date(invoice.sentAt), "dd/MM/yyyy HH:mm")}</Typography>
                    <Typography variant="caption" color="text.secondary">by {invoice.sentBy?.name}</Typography>
                  </Grid>
                )}
                {invoice.paidAt && (
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">Paid:</Typography>
                    <Typography variant="body2">{format(new Date(invoice.paidAt), "dd/MM/yyyy HH:mm")}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialogs */}
      {/* Re-verify Dialog */}
      <Dialog open={reVerifyDialog} onClose={() => setReVerifyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "warning.main" }}>
            <Warning /><Typography variant="h6">Re-verify Sent Invoice?</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>This invoice has already been sent to the school.</Alert>
          <Typography paragraph><strong>Warning:</strong> Modifying a sent invoice will:</Typography>
          <ul>
            <li>Change the invoice amount and details</li>
            <li>Require re-sending to the school</li>
            <li>Create a new verification record</li>
            <li>The school will see the updated version</li>
          </ul>
          <Typography variant="body2" color="text.secondary">
            Consider if this correction is critical. For minor issues, adjust in next month's invoice instead.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReVerifyDialog(false)}>Cancel</Button>
          <Button onClick={handleReVerify} variant="contained" color="warning">Yes, Re-verify</Button>
        </DialogActions>
      </Dialog>

      {/* Resend Dialog */}
      <Dialog open={resendDialog} onClose={() => setResendDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Send color="primary" />
            <Typography variant="h6">
              {invoice?.status === "Verified" ? "Send Invoice" : "Resend Invoice"}?
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            {invoice?.status === "Verified"
              ? `Send this invoice to ${invoice?.schoolDetails?.name}?`
              : `Resend this invoice to ${invoice?.schoolDetails?.name}?`}
          </Typography>

          {/* Email validation */}
          {!invoice?.schoolDetails?.email && !invoice?.school?.email && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2"><strong>No email found!</strong> Please update school details first.</Typography>
            </Alert>
          )}

          {invoice?.status === "Sent" && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Previously sent:</strong> {format(new Date(invoice.sentAt), "dd/MM/yyyy HH:mm")}
                  {invoice.sentBy?.name && ` by ${invoice.sentBy.name}`}
                </Typography>
              </Alert>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Reason for resending (optional)"
                placeholder="E.g., School didn't receive, Updated PDF, etc."
                value={resendReason}
                onChange={(e) => setResendReason(e.target.value)}
                sx={{ mt: 2 }}
              />
            </>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Email:</strong> {invoice?.schoolDetails?.email || invoice?.school?.email || "No email on record"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setResendDialog(false); setResendReason(""); }}>Cancel</Button>
          <Button
            onClick={handleResend}
            variant="contained"
            color="primary"
            disabled={sending || (!invoice?.schoolDetails?.email && !invoice?.school?.email)}
          >
            {sending ? "Sending..." : (invoice?.status === "Verified" ? "Send" : "Resend")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)}>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
            <Warning /><Typography variant="h6">Cancel Invoice?</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>Are you sure you want to cancel this invoice?</Typography>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. Cancelled invoices cannot be modified further.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)} disabled={loading}>No, Keep it</Button>
          <Button onClick={handleCancel} variant="contained" color="error" disabled={loading}>
            {loading ? "Cancelling..." : "Yes, Cancel Invoice"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvoiceView;