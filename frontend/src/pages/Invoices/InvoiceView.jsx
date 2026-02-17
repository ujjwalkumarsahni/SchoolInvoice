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
} from "@mui/material";
import {
  ArrowBack,
  CheckCircle,
  Payment,
  GetApp,
  Cancel,
  Edit,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
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

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
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

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
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
            color={invoice.paymentStatus === "Paid" ? "success" : "warning"}
            size="small"
          />
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
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
          <Button
            variant="outlined"
            startIcon={<GetApp />}
            onClick={handleDownload}
          >
            Download PDF
          </Button>
        </Box>
      </Box>

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
                <TableCell align="center">Working Days</TableCell>
                <TableCell align="right">Prorated Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{item.employeeName}</TableCell>
                  <TableCell>{item.employeeId}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(item.monthlyBillingSalary)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={item.leaveDays}
                      size="small"
                      color={item.leaveDays > 0 ? "warning" : "success"}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {item.actualWorkingDays}/{item.workingDays}
                  </TableCell>
                  <TableCell align="right" fontWeight="bold">
                    {formatCurrency(item.proratedAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Summary */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Invoice Summary
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Subtotal:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right">
                      {formatCurrency(invoice.subtotal)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      TDS ({invoice.tdsPercent}%):
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right" color="error">
                      - {formatCurrency(invoice.tdsAmount)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      GST ({invoice.gstPercent}%):
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right" color="success">
                      + {formatCurrency(invoice.gstAmount)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Round Off:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right">
                      {formatCurrency(invoice.roundOff)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="h6">Grand Total:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6" align="right" color="primary">
                      {formatCurrency(invoice.grandTotal)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Details
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Payment Status:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Chip
                      label={invoice.paymentStatus}
                      size="small"
                      color={
                        invoice.paymentStatus === "Paid" ? "success" : "warning"
                      }
                      sx={{ float: "right" }}
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Paid Amount:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right" fontWeight="bold">
                      {formatCurrency(invoice.paidAmount || 0)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Due Amount:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="body2"
                      align="right"
                      fontWeight="bold"
                      color="error"
                    >
                      {formatCurrency(
                        invoice.grandTotal - (invoice.paidAmount || 0),
                      )}
                    </Typography>
                  </Grid>

                  {invoice.paidAt && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Paid On:
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
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {invoice.customizations?.leaveAdjustments?.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="warning.main">
                  Customizations Applied
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
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.customizations.leaveAdjustments.map(
                        (adj, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {adj.employee?.basicInfo?.fullName}
                            </TableCell>
                            <TableCell>{adj.originalLeaveDays}</TableCell>
                            <TableCell>{adj.adjustedLeaveDays}</TableCell>
                            <TableCell>{adj.reason}</TableCell>
                            <TableCell>{adj.adjustedBy?.name}</TableCell>
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

        {invoice.notes && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Notes
                </Typography>
                <Typography variant="body2">{invoice.notes}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default InvoiceView;
