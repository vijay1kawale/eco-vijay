require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const adminRoutes = require('./routes/admin');
const adminDashboardRoutes = require('./routes/adminDashboard');
const adminUsersRoutes = require('./routes/adminUsers');
const adminAttendanceRoutes = require('./routes/adminAttendance');
const adminQuotationsRoutes = require('./routes/adminQuotations');
const adminActivityLogsRoutes = require('./routes/adminActivityLogs');
const adminCompaniesRoutes = require('./routes/adminCompanies');

const authRoutes = require('./routes/auth');
const companiesRoutes = require('./routes/companies');
const quotationsRoutes = require('./routes/quotations');
const usersRoutes = require('./routes/users');
const geocodeRoutes = require('./routes/geocode');
const attendanceRoutes = require('./routes/attendance');
// FIXED: mount leads route
const leadsRoutes = require('./routes/leads');
// FIXED: mount Excel import/export routes
const adminImportExportRoutes = require('./routes/adminImportExport');
// NEW: mount visits route
const visitsRoutes = require('./routes/visits');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Serve static files for uploaded content (visits photos, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/companies', companiesRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/quotations', quotationsRoutes);
app.use('/api/quotations', quotationsRoutes);
app.use('/users', usersRoutes);
app.use('/api/users', usersRoutes);
app.use('/geocode', geocodeRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/api/attendance', attendanceRoutes);
// FIXED: leads route was missing
app.use('/leads', leadsRoutes);
app.use('/api/leads', leadsRoutes);
// NEW: visits route
app.use('/visits', visitsRoutes);
app.use('/api/visits', visitsRoutes);

// Admin routes
app.use('/admin', adminRoutes);
app.use('/api/admin', adminRoutes);

// Admin sub-module routes
app.use('/admin/dashboard', adminDashboardRoutes);
// IMPORTANT: import/export routes must come BEFORE /admin/users so /admin/users/template
// and /admin/users/export are matched before the :id param route
app.use('/admin', adminImportExportRoutes);
app.use('/admin/users', adminUsersRoutes);
app.use('/admin/attendance', adminAttendanceRoutes);
app.use('/admin/quotations', adminQuotationsRoutes);
app.use('/admin/activity-logs', adminActivityLogsRoutes);
app.use('/admin/companies', adminCompaniesRoutes);
// NEW: admin visits endpoint
const adminVisitsRoutes = require('./routes/adminVisits');
app.use('/admin/visits', adminVisitsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Eco-Vijay Backend', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Eco-Vijay Backend', timestamp: new Date().toISOString() });
});

// JSON fallback for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message || 'Unknown error' });
});

// Local dev: start the server; Vercel serverless: just export the app
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Eco-Vijay backend running on port ${PORT}`);
  });
}

module.exports = app;
