/* eslint-disable */

const express = require('express');
const path = require('path');
require('dotenv').config();
const session = require('express-session');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// 新增：配置 session
app.use(session({
  secret: 'dogwalk_secret', // 建议用更安全的密钥
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // 本地开发用 false，生产环境用 true
}));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Export the app instead of listening here
module.exports = app;