// pages/Invoices/Invoices.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  IconButton,
  Chip,
  MenuItem,
  Grid,
  Typography,
  Tooltip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  Checkbox,
  Avatar,
  Badge
} from "@mui/material";
import {
  Visibility,
  GetApp,
  CheckCircle,
  Send,
  Payment,
  Cancel,
  Refresh,
  PictureAsPdf,
  FilterList,
  Download,
  Receipt
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
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

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: "",
    paymentStatus: "",
    search: "",
  });
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, [page, rowsPerPage, filters]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...filters,
      };
      const response = await invoiceService.getInvoices(params);
      setInvoices(response.data.data);
      setTotal(response.data.pagination.total);
    } catch (error) {
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await invoiceService.getStats({
        month: filters.month,
        year: filters.year
      });
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleAutoGenerate = async () => {
    if (!window.confirm(`Generate invoices for ${filters.month}/${filters.year}?`))
      return;

    try {
      setGenerating(true);
      const response = await invoiceService.autoGenerate({
        manualMonth: filters.month,
        manualYear: filters.year,
      });
      toast.success(response.data.message || "Invoices generated successfully");
      fetchInvoices();
      fetchStats();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to generate invoices",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkSend = async () => {
    if (selectedInvoices.length === 0) {
      toast.error("Please select at least one invoice");
      return;
    }

    if (!window.confirm(`Send ${selectedInvoices.length} invoices to schools?`))
      return;

    try {
      setSending(true);
      const response = await invoiceService.sendBulk(selectedInvoices);
      toast.success(`Sent ${response.data.data.sent.length} invoices`);
      setSelectedInvoices([]);
      fetchInvoices();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send invoices");
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async (id, invoiceNumber) => {
    try {
      const response = await invoiceService.downloadInvoice(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Download started");
    } catch (error) {
      toast.error("Failed to download invoice");
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedInvoices(invoices.map((inv) => inv._id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedInvoices((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTotalAmount = () => {
    return invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  };

  const getTotalDue = () => {
    return invoices.reduce((sum, inv) => sum + (inv.grandTotal - (inv.paidAmount || 0)), 0);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Invoices
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and track all school invoices
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              fetchInvoices();
              fetchStats();
            }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
            color={showFilters ? "primary" : "inherit"}
          >
            Filters
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PictureAsPdf />}
            onClick={handleAutoGenerate}
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate Invoices"}
          </Button>
          {selectedInvoices.length > 0 && (
            <Button
              variant="contained"
              color="success"
              startIcon={<Send />}
              onClick={handleBulkSend}
              disabled={sending}
            >
              Send {selectedInvoices.length} Invoice{selectedInvoices.length > 1 ? 's' : ''}
            </Button>
          )}
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Invoices
                </Typography>
                <Typography variant="h4">
                  {stats.byStatus?.reduce((sum, s) => sum + s.count, 0) || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Amount
                </Typography>
                <Typography variant="h4">
                  {formatCurrency(stats.byStatus?.reduce((sum, s) => sum + s.totalAmount, 0) || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Paid Amount
                </Typography>
                <Typography variant="h4" color="success.main">
                  {formatCurrency(stats.byPaymentStatus?.find(s => s._id === 'Paid')?.paidAmount || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Due Amount
                </Typography>
                <Typography variant="h4" color="error.main">
                  {formatCurrency(
                    (stats.byPaymentStatus?.find(s => s._id === 'Unpaid')?.totalAmount || 0) +
                    (stats.byPaymentStatus?.find(s => s._id === 'Partial')?.totalAmount || 0)
                  )}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Month</InputLabel>
                <Select
                  value={filters.month}
                  label="Month"
                  onChange={(e) =>
                    setFilters({ ...filters, month: e.target.value })
                  }
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {new Date(2000, i, 1).toLocaleString("default", {
                        month: "long",
                      })}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                size="small"
                label="Year"
                type="number"
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Generated">Generated</MenuItem>
                  <MenuItem value="Verified">Verified</MenuItem>
                  <MenuItem value="Sent">Sent</MenuItem>
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment</InputLabel>
                <Select
                  value={filters.paymentStatus}
                  label="Payment"
                  onChange={(e) =>
                    setFilters({ ...filters, paymentStatus: e.target.value })
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Unpaid">Unpaid</MenuItem>
                  <MenuItem value="Partial">Partial</MenuItem>
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Overdue">Overdue</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Search by invoice or school"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedInvoices.length > 0 &&
                    selectedInvoices.length < invoices.length
                  }
                  checked={
                    invoices.length > 0 &&
                    selectedInvoices.length === invoices.length
                  }
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Invoice No.</TableCell>
              <TableCell>School</TableCell>
              <TableCell>Period</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Payment</TableCell>
              <TableCell>Due</TableCell>
              <TableCell>Generated</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                  <Alert severity="info">No invoices found</Alert>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => {
                const due = invoice.grandTotal - (invoice.paidAmount || 0);
                return (
                  <TableRow key={invoice._id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedInvoices.includes(invoice._id)}
                        onChange={() => handleSelectOne(invoice._id)}
                        disabled={invoice.status !== "Verified"}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {invoice.invoiceNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {invoice.school?.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {invoice.school?.city}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {invoice.month}/{invoice.year}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(invoice.grandTotal)}
                      </Typography>
                      {invoice.previousDue > 0 && (
                        <Typography variant="caption" color="warning.main" display="block">
                          (includes prev due: {formatCurrency(invoice.previousDue)})
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.status}
                        size="small"
                        color={statusColors[invoice.status] || "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.paymentStatus}
                        size="small"
                        color={paymentStatusColors[invoice.paymentStatus] || "default"}
                      />
                    </TableCell>
                    <TableCell>
                      {due > 0 ? (
                        <Typography variant="body2" color="error.main" fontWeight="bold">
                          {formatCurrency(due)}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="success.main">
                          ₹0
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.generatedAt), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.5,
                          justifyContent: "center",
                        }}
                      >
                        <Tooltip title="View">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => navigate(`/invoices/${invoice._id}`)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {invoice.status === "Generated" && (
                          <Tooltip title="Verify">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() =>
                                navigate(`/invoices/${invoice._id}/verify`)
                              }
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {(invoice.status === "Verified" || invoice.status === "Sent") &&
                          invoice.paymentStatus !== "Paid" && (
                            <Tooltip title="Record Payment">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() =>
                                  navigate(`/invoices/${invoice._id}/payment`)
                                }
                              >
                                <Payment fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                        <Tooltip title="Download PDF">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() =>
                              handleDownload(invoice._id, invoice.invoiceNumber)
                            }
                          >
                            <GetApp fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />

      {/* Summary Footer */}
      {invoices.length > 0 && (
        <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Total Invoices:
              </Typography>
              <Typography variant="h6">{invoices.length}</Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Total Amount:
              </Typography>
              <Typography variant="h6" color="primary.main">
                {formatCurrency(getTotalAmount())}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Total Paid:
              </Typography>
              <Typography variant="h6" color="success.main">
                {formatCurrency(getTotalAmount() - getTotalDue())}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Total Due:
              </Typography>
              <Typography variant="h6" color="error.main">
                {formatCurrency(getTotalDue())}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default Invoices;