import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";

// Load env variables
dotenv.config();
connectDB();

const app = express();

// ======================
// CORS Configuration (SIMPLIFIED)
// ======================
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'https://cpd-frontend.onrender.com'],
  credentials: true,
  exposedHeaders: ['x-device-fingerprint', 'x-device-signals', 'Authorization'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-device-fingerprint', 
    'x-device-signals'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// ======================
// Other Middleware
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());


// ======================
// Health Check
// ======================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// ======================
// 404 Handler
// ======================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// ======================
// Error Handler
// ======================
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

// ======================
// Server Start
// ======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});