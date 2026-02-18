// pages/Invoices/InvoiceView.jsx - TOP PAR YEH LIKHO
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
  TextField, // 👈 YEH IMPORT KARO (Resend reason ke liye)
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
  Refresh, // 👈 YEH BHI ADD KARO (resend icon ke liye)
} from "@mui/icons-material";
import { useParams, useNavigate, useLocation } from "react-router-dom"; // 👈 useLocation ADD KARO
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

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // 👈 YEH ADD KARO
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  // 👇 YEH TINO STATE VARIABLES ADD KARO
  const [reVerifyDialog, setReVerifyDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [resendDialog, setResendDialog] = useState(false);
  const [resendReason, setResendReason] = useState(""); // 👈 Resend reason ke liye
  const [sending, setSending] = useState(false); // 👈 Sending status ke liye

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  // Check if we came from verify page with success
  useEffect(() => {
    if (location.state?.verifySuccess) {
      toast.success(location.state.message || "Invoice verified successfully");
      // Clear the state
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
  // 👇 YEH NAYA FUNCTION ADD KARO (RESEND KE LIYE)
  const handleResend = async () => {
    try {
      setSending(true);

      const resendData = {
        reason:
          resendReason ||
          (invoice.status === "Verified"
            ? "First time sending"
            : "Resending to school"),
        regeneratePDF: true, // Naya PDF generate karo
      };

      let response;

      if (invoice.status === "Verified") {
        // Pehli baar send kar rahe hain to sendBulk use karo
        response = await invoiceService.sendBulk([id], resendData.reason);
      } else {
        // Already sent hai to resend API call karo
        response = await invoiceService.resendInvoice(id, resendData);
      }

      toast.success(response.data.message || "Invoice sent successfully");
      setResendDialog(false);
      setResendReason("");
      fetchInvoice(); // Refresh karo
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

  // 👇 YEH SARE HELPER FUNCTIONS ADD KARO
  const canVerify = () => {
    return invoice?.status === "Generated";
  };

  const canReVerify = () => {
    // Verified ya Sent dono ko re-verify kar sakte hain
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
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
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

          {/* Show verification count */}
          {invoice.verificationHistory?.length > 0 && (
            <Tooltip
              title={`Verified ${invoice.verificationHistory.length} time(s)`}
            >
              <Chip
                icon={<History />}
                label={`v${invoice.verificationHistory.length}`}
                size="small"
                variant="outlined"
              />
            </Tooltip>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {/* Show appropriate action buttons based on status */}

          {/* 1. For Generated invoices - Show Verify */}
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

          {/* 2. For Verified invoices - Show Send & Re-verify */}
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
                onClick={() =>
                  navigate(`/invoices/${id}/verify`, {
                    state: { isReVerify: true },
                  })
                }
              >
                Re-verify
              </Button>
            </>
          )}

          {/* 3. For Sent invoices - Show Resend & Re-verify (with warning) */}
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
                  Re-verify (Sent)
                </Button>
              </Tooltip>
            </>
          )}

          {/* 4. For Sent invoices with due payment - Show Record Payment */}
          {invoice.status === "Sent" && invoice.paymentStatus !== "Paid" && (
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

          {/* 5. Cancel button (always show if cancellable) */}
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

          {/* 6. Download button (always show) */}
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
              {" "}
              • <strong>Sent on:</strong>{" "}
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
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
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
                      {item.actualWorkingDays ||
                        item.workingDays - item.leaveDays}
                      /{item.workingDays}
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
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

      {/* Summary */}
      <Grid container spacing={3}>
        {/* Step-by-Step Calculation */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Invoice Calculation Breakdown
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Here's how your invoice total was calculated, step by step:
              </Typography>

              <Box sx={{ mt: 3 }}>
                {/* Step 1: Subtotal */}
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar
                        sx={{
                          bgcolor: "primary.main",
                          width: 28,
                          height: 28,
                          fontSize: "0.875rem",
                        }}
                      >
                        1
                      </Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Calculate Subtotal
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Sum of all employee prorated amounts
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2">
                          Total of all items:
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {formatCurrency(invoice.subtotal)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Step 2: Apply TDS */}
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar
                        sx={{
                          bgcolor: "primary.main",
                          width: 28,
                          height: 28,
                          fontSize: "0.875rem",
                        }}
                      >
                        2
                      </Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Apply TDS (Tax Deducted at Source)
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        TDS is calculated on the subtotal amount
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2">
                          {invoice.tdsPercent}% of{" "}
                          {formatCurrency(invoice.subtotal)}:
                        </Typography>
                        <Typography variant="h6" color="error">
                          - {formatCurrency(invoice.tdsAmount)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Step 3: Add GST */}
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar
                        sx={{
                          bgcolor: "primary.main",
                          width: 28,
                          height: 28,
                          fontSize: "0.875rem",
                        }}
                      >
                        3
                      </Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Add GST (Goods & Services Tax)
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        GST is applied after TDS deduction
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2">
                          {invoice.gstPercent}% of (Subtotal - TDS):
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          + {formatCurrency(invoice.gstAmount)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Step 4: Previous Due (if any) */}
                {invoice.previousDue > 0 && (
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}
                  >
                    <Grid container alignItems="center" spacing={2}>
                      <Grid item xs={12} sm={1}>
                        <Avatar
                          sx={{
                            bgcolor: "warning.main",
                            width: 28,
                            height: 28,
                            fontSize: "0.875rem",
                          }}
                        >
                          4
                        </Avatar>
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          Add Previous Due
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Outstanding amount from previous invoices
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography variant="body2">
                            Previous due amount:
                          </Typography>
                          <Typography variant="h6" color="warning.main">
                            + {formatCurrency(invoice.previousDue)}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                )}

                {/* Step 5: Round Off */}
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar
                        sx={{
                          bgcolor:
                            invoice.roundOff >= 0
                              ? "success.main"
                              : "error.main",
                          width: 28,
                          height: 28,
                          fontSize: "0.875rem",
                        }}
                      >
                        5
                      </Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Round Off Adjustment
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Round to nearest whole number
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2">
                          Round off adjustment:
                        </Typography>
                        <Typography
                          variant="h6"
                          color={
                            invoice.roundOff >= 0
                              ? "success.main"
                              : "error.main"
                          }
                        >
                          {invoice.roundOff >= 0 ? "+" : ""}
                          {formatCurrency(invoice.roundOff)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Final Total */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: "primary.light",
                    border: "2px solid",
                    borderColor: "primary.main",
                  }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={1}>
                      <Avatar
                        sx={{
                          bgcolor: "success.main",
                          width: 28,
                          height: 28,
                          fontSize: "0.875rem",
                        }}
                      >
                        ✓
                      </Avatar>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color="primary.dark"
                      >
                        Final Amount
                      </Typography>
                      <Typography variant="body2" color="primary.dark">
                        Total invoice amount after all calculations
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="h5"
                          fontWeight="bold"
                          color="primary.dark"
                        >
                          GRAND TOTAL:
                        </Typography>
                        <Typography
                          variant="h4"
                          fontWeight="bold"
                          color="primary.dark"
                        >
                          {formatCurrency(invoice.grandTotal)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          mt: 1,
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Typography variant="caption" color="primary.dark">
                          = Subtotal - TDS + GST{" "}
                          {invoice.previousDue > 0 ? "+ Previous Due" : ""} ±
                          Round Off
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Details - UPDATED VERSION */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                💰 Payment Details
              </Typography>

              {/* Payment Progress Bar */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Payment Progress
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {invoice.paidAmount
                      ? Math.round(
                          (invoice.paidAmount / invoice.grandTotal) * 100,
                        )
                      : 0}
                    %
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: "100%",
                    height: 8,
                    bgcolor: "grey.200",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: `${invoice.paidAmount ? (invoice.paidAmount / invoice.grandTotal) * 100 : 0}%`,
                      height: "100%",
                      bgcolor:
                        invoice.paymentStatus === "Paid"
                          ? "success.main"
                          : invoice.paymentStatus === "Partial"
                            ? "warning.main"
                            : "error.main",
                      transition: "width 0.3s",
                    }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Payment Summary */}
              <Grid container spacing={2}>
                {/* Status Chip */}
                <Grid item xs={12}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Payment Status:
                    </Typography>
                    <Chip
                      label={invoice.paymentStatus}
                      size="small"
                      color={paymentStatusColors[invoice.paymentStatus]}
                      sx={{ fontWeight: "bold" }}
                    />
                  </Box>
                </Grid>

                {/* Invoice Total */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Invoice Total:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" fontWeight="bold">
                    {formatCurrency(invoice.grandTotal)}
                  </Typography>
                </Grid>

                {/* Paid Amount */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Paid Amount:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    align="right"
                    color="success.main"
                    fontWeight="bold"
                  >
                    {formatCurrency(invoice.paidAmount || 0)}
                  </Typography>
                </Grid>

                {/* Due Amount */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Due Amount:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    align="right"
                    color="error"
                    fontWeight="bold"
                  >
                    {formatCurrency(dueAmount)}
                  </Typography>
                </Grid>

                {/* Last Payment Date (if any) */}
                {invoice.paidAt && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Last Payment:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" align="right">
                        {format(new Date(invoice.paidAt), "dd/MM/yyyy")}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>

              {/* Payment History Section ke andar - after TableContainer */}
              {invoice.paymentHistory?.length === 0 && (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 3,
                    bgcolor: "grey.50",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No payment history available
                  </Typography>
                </Box>
              )}

              {/* Payment History - Line ~780 ke around */}
              <TableBody>
                {invoice.paymentHistory.map((payment, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {/* 👇 YEH CHANGE KARO - payment.date ki jagah payment.paymentDate ya payment.recordedAt */}
                      {format(
                        new Date(
                          payment.paymentDate ||
                            payment.recordedAt ||
                            payment.date,
                        ),
                        "dd/MM/yyyy",
                      )}
                    </TableCell>
                    <TableCell align="right" fontWeight="bold">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      {payment.paymentMethod || payment.method}
                    </TableCell>
                    <TableCell>
                      <Tooltip
                        title={
                          payment.referenceNumber ||
                          payment.reference ||
                          "No reference"
                        }
                      >
                        <span>
                          {payment.referenceNumber || payment.reference
                            ? (
                                payment.referenceNumber || payment.reference
                              ).substring(0, 8) + "..."
                            : "-"}
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

              {/* Payment Instructions */}
              <Box sx={{ mt: 2, p: 2, bgcolor: "info.light", borderRadius: 1 }}>
                <Typography
                  variant="caption"
                  color="info.contrastText"
                  display="block"
                >
                  💡 <strong>Note:</strong> Payment can be made via Cash,
                  Cheque, or Bank Transfer.
                </Typography>
                {dueAmount > 0 && (
                  <Typography
                    variant="caption"
                    color="info.contrastText"
                    display="block"
                    sx={{ mt: 0.5 }}
                  >
                    Due amount of {formatCurrency(dueAmount)} is pending.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Tax Details - Already there but ensure it's complete */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Tax Details
              </Typography>

              {/* Tax Summary */}
              <Grid container spacing={2}>
                {/* TDS */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    TDS Rate:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" fontWeight="bold">
                    {invoice.tdsPercent}%
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    TDS Amount:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    align="right"
                    color="error"
                    fontWeight="bold"
                  >
                    - {formatCurrency(invoice.tdsAmount)}
                  </Typography>
                </Grid>

                {/* GST */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    GST Rate:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" fontWeight="bold">
                    {invoice.gstPercent}%
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    GST Amount:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    align="right"
                    color="success.main"
                    fontWeight="bold"
                  >
                    + {formatCurrency(invoice.gstAmount)}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                {/* Net Tax Effect */}
                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontWeight="bold"
                  >
                    Net Tax Effect:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    align="right"
                    fontWeight="bold"
                    color={
                      invoice.gstAmount - invoice.tdsAmount >= 0
                        ? "success.main"
                        : "error.main"
                    }
                  >
                    {invoice.gstAmount - invoice.tdsAmount >= 0 ? "+" : ""}
                    {formatCurrency(invoice.gstAmount - invoice.tdsAmount)}
                  </Typography>
                </Grid>

                {/* Tax Calculation Note */}
                <Grid item xs={12}>
                  <Box
                    sx={{ mt: 2, p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      <strong>Calculation:</strong> Subtotal (
                      {formatCurrency(invoice.subtotal)})
                      {invoice.tdsPercent > 0
                        ? ` - TDS ${invoice.tdsPercent}% (${formatCurrency(invoice.tdsAmount)})`
                        : ""}
                      {invoice.gstPercent > 0
                        ? ` + GST ${invoice.gstPercent}% (${formatCurrency(invoice.gstAmount)})`
                        : ""}
                      {invoice.previousDue > 0
                        ? ` + Previous Due (${formatCurrency(invoice.previousDue)})`
                        : ""}
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
                <Typography variant="h6" gutterBottom color="warning.main">
                  🔧 Customizations Applied
                </Typography>
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
                      {invoice.customizations.leaveAdjustments.map(
                        (adj, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {adj.employee?.basicInfo?.fullName ||
                                adj.employeeName ||
                                "N/A"}
                            </TableCell>
                            <TableCell>{adj.originalLeaveDays}</TableCell>
                            <TableCell>{adj.adjustedLeaveDays}</TableCell>
                            <TableCell>{adj.reason}</TableCell>
                            <TableCell>
                              {adj.adjustedBy?.name || "Admin"}
                            </TableCell>
                            <TableCell>
                              {format(new Date(adj.adjustedAt), "dd/MM/yyyy")}
                            </TableCell>
                          </TableRow>
                        ),
                      )}
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
                <Typography variant="h6" gutterBottom>
                  📜 Verification History
                </Typography>
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
                          <TableCell>
                            {format(
                              new Date(history.verifiedAt),
                              "dd/MM/yyyy HH:mm",
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={history.status}
                              size="small"
                              color={
                                history.status === "Re-verified"
                                  ? "secondary"
                                  : "success"
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {history.verifiedBy?.name || "System"}
                          </TableCell>
                          <TableCell>
                            {history.changes?.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: 16 }}>
                                {history.changes.map((change, idx) => (
                                  <li key={idx}>
                                    <Typography variant="caption">
                                      {change}
                                    </Typography>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              "No changes"
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {history.notes || "-"}
                            </Typography>
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

        {invoice.resendHistory?.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📤 Resend History
                </Typography>
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
                          <TableCell>
                            {format(
                              new Date(history.resentAt),
                              "dd/MM/yyyy HH:mm",
                            )}
                          </TableCell>
                          <TableCell>
                            {history.resentBy?.name || "Admin"}
                          </TableCell>
                          <TableCell>{history.reason || "Resent"}</TableCell>
                          <TableCell>
                            {history.previousSentAt
                              ? format(
                                  new Date(history.previousSentAt),
                                  "dd/MM/yyyy HH:mm",
                                )
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
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  📝 Notes
                </Typography>
                <Typography variant="body2" style={{ whiteSpace: "pre-line" }}>
                  {invoice.notes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Timeline */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📅 Timeline
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Generated:
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(invoice.generatedAt), "dd/MM/yyyy HH:mm")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    by {invoice.generatedBy?.name || "System"}
                  </Typography>
                </Grid>

                {invoice.verifiedAt && (
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Last Verified:
                    </Typography>
                    <Typography variant="body2">
                      {format(new Date(invoice.verifiedAt), "dd/MM/yyyy HH:mm")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      by {invoice.verifiedBy?.name}
                    </Typography>
                  </Grid>
                )}

                {invoice.sentAt && (
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Sent:
                    </Typography>
                    <Typography variant="body2">
                      {format(new Date(invoice.sentAt), "dd/MM/yyyy HH:mm")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      by {invoice.sentBy?.name}
                    </Typography>
                  </Grid>
                )}

                {invoice.paidAt && (
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Paid:
                    </Typography>
                    <Typography variant="body2">
                      {format(new Date(invoice.paidAt), "dd/MM/yyyy HH:mm")}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Re-verify Confirmation Dialog - UPDATE KARO */}
      <Dialog
        open={reVerifyDialog}
        onClose={() => setReVerifyDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "warning.main",
            }}
          >
            <Warning />
            <Typography variant="h6">Re-verify Sent Invoice?</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This invoice has already been sent to the school.
          </Alert>

          <Typography paragraph>
            <strong>Warning:</strong> Modifying a sent invoice will:
          </Typography>

          <ul>
            <li>Change the invoice amount and details</li>
            <li>Require re-sending to the school</li>
            <li>Create a new verification record</li>
            <li>The school will see the updated version</li>
          </ul>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Consider if this correction is critical. For minor issues, you might
            want to adjust in next month's invoice instead.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReVerifyDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setReVerifyDialog(false);
              navigate(`/invoices/${id}/verify`, {
                state: {
                  isReVerify: true,
                  fromSent: true,
                },
              });
            }}
            variant="contained"
            color="warning"
          >
            Yes, Re-verify
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resend/Send Confirmation Dialog - UPDATE KARO */}
      <Dialog
        open={resendDialog}
        onClose={() => setResendDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Send color="primary" />
            <Typography variant="h6">
              {invoice?.status === "Verified"
                ? "Send Invoice"
                : "Resend Invoice"}
              ?
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            {invoice?.status === "Verified"
              ? `Send this invoice to ${invoice?.schoolDetails?.name}?`
              : `Resend this invoice to ${invoice?.schoolDetails?.name}?`}
          </Typography>

          {invoice?.status === "Sent" && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Previously sent:</strong>{" "}
                  {format(new Date(invoice.sentAt), "dd/MM/yyyy HH:mm")}
                  {invoice.sentBy?.name && ` by ${invoice.sentBy.name}`}
                </Typography>
              </Alert>

              {/* 👈 YEH TEXT FIELD ADD KARO - Resend reason ke liye */}
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
            <strong>Email:</strong>{" "}
            {invoice?.schoolDetails?.email || invoice?.school?.email}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setResendDialog(false);
              setResendReason(""); // Reset reason on cancel
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleResend}
            variant="contained"
            color="primary"
            disabled={sending}
          >
            {sending
              ? "Sending..."
              : invoice?.status === "Verified"
                ? "Send"
                : "Resend"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog - UPDATE KARO */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)}>
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "error.main",
            }}
          >
            <Warning />
            <Typography variant="h6">Cancel Invoice?</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Are you sure you want to cancel this invoice?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. Cancelled invoices will be marked as
            cancelled and cannot be modified further.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)} disabled={loading}>
            No, Keep it
          </Button>
          <Button
            onClick={handleCancel}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? "Cancelling..." : "Yes, Cancel Invoice"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvoiceView;
