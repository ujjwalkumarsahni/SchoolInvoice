import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";



// MONGODB_URI = mongodb+srv://ujjwalkumar0514_db_user:niPo2rOO1QQqSpTA@cluster0.lw7jn1f.mongodb.net
// JWT_SECRET=your_super_secure_jwt_secret_key_change_in_production
// JWT_EXPIRES_IN=7d

// CLOUDINARY_CLOUD_NAME=domel2a7e
// CLOUDINARY_API_KEY=896597977738598
// CLOUDINARY_API_SECRET=6YdSLvnN2gqnz-06W-49E8fTZFo
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
import schoolRoutes from "./routes/schoolRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import employeePostingRoutes from "./routes/employeePostingRoutes.js";
import invoiceRoutes from './routes/invoiceRoutes.js';    
import paymentRoutes from './routes/paymentRoutes.js';
app.use("/api/auth", authRoutes);
app.use('/api/schools', schoolRoutes);
app.use("/api/employee",employeeRoutes);
app.use('/api/employee-postings', employeePostingRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
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