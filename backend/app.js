const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const dotenvPath = fs.existsSync(path.join(__dirname, '.env'))
  ? path.join(__dirname, '.env')
  : path.join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });

const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const staffRoutes = require('./routes/staffRoutes');
const finalYearProjectRoutes = require('./routes/finalYearProjectRoutes');
const internshipReportRoutes = require('./routes/internshipReportRoutes');
const markRoutes = require('./routes/markRoutes');
const statsRoutes = require('./routes/statsRoutes');
const fileRoutes = require('./routes/fileRoutes');

const app = express();

// Ensure DB connected (cached connection across serverless invocations)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[DB Middleware Error]', err);
    res.status(500).json({ success: false, message: 'Database connection failed: ' + err.message });
  }
});

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Normalizer middleware to strip '/.netlify/functions/api' prefix if present
app.use((req, res, next) => {
  if (req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace('/.netlify/functions/api', '/api') || '/';
  }
  next();
});

// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    system: 'College ERP Backend',
    database: 'MongoDB Atlas',
    timestamp: new Date(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/final-projects', finalYearProjectRoutes);
app.use('/api/internships', internshipReportRoutes);
app.use('/api/marks', markRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/files', fileRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.stack || err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
