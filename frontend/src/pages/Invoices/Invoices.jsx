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
} from "@mui/material";
import {
  Visibility,
  GetApp,
  CheckCircle,
  Send,
  Payment,
  Cancel,
  FilterList,
  Refresh,
  PictureAsPdf,
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

  useEffect(() => {
    fetchInvoices();
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

  const handleAutoGenerate = async () => {
    if (
      !window.confirm(`Generate invoices for ${filters.month}/${filters.year}?`)
    )
      return;

    try {
      setGenerating(true);
      await invoiceService.autoGenerate({
        manualMonth: filters.month,
        manualYear: filters.year,
      });
      toast.success("Invoices generated successfully");
      fetchInvoices();
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
    } catch (error) {
      toast.error("Failed to send invoices");
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

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">Invoices</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchInvoices}
          >
            Refresh
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
              Send {selectedInvoices.length} Invoices
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
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
              <TableCell>Generated</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  <Alert severity="info">No invoices found</Alert>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
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
                  <TableCell>{invoice.school?.name}</TableCell>
                  <TableCell>
                    {invoice.month}/{invoice.year}
                  </TableCell>
                  <TableCell align="right" fontWeight="bold">
                    {formatCurrency(invoice.grandTotal)}
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
                      color={
                        paymentStatusColors[invoice.paymentStatus] || "default"
                      }
                    />
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

                      {invoice.status === "Sent" &&
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
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
      />
    </Box>
  );
};

export default Invoices;
