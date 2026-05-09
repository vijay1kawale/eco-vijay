require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const companiesRoutes = require('./routes/companies');
const quotationsRoutes = require('./routes/quotations');
const usersRoutes = require('./routes/users');
const geocodeRoutes = require('./routes/geocode');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/companies', companiesRoutes);
app.use('/quotations', quotationsRoutes);
app.use('/users', usersRoutes);
app.use('/geocode', geocodeRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Eco-Vijay Backend', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Eco-Vijay backend running on port ${PORT}`);
});
