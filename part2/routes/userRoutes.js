/* eslint-disable */

const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all users (for admin/testing)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, username, email, role FROM users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST a new user (simple signup)
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `, [username, email, password, role]);

    res.status(201).json({ message: 'User registered', user_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json(req.session.user);
});

// POST login (dummy version)
router.post('/login', async (req, res) => {
  const { username, password } = req.body; //
  console.log('req.body =', req.body);
  try {
    const [rows] = await db.query(`
      SELECT user_id, username, role FROM users
      WHERE username = ? AND password_hash = ?
    `, [username, password]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // login success, store information into session
    req.session.user = rows[0];

    // return the role
    res.json({ message: 'log in successful', role: rows[0].role });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// logout 
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: '注销失败' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: '注销成功' });
  });
});

// 获取当前登录用户的所有狗
router.get('/my-dogs', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: '未登录' });
  }
  const ownerId = req.session.user.user_id;
  try {
    // 假设 dogs 表结构为：dog_id, owner_id, name, size
    const [rows] = await db.query('SELECT dog_id, name FROM dogs WHERE owner_id = ?', [ownerId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: '获取狗列表失败' });
  }
});

// GET all dogs for the main page
router.get('/dogs', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT dog_id, name, size, owner_id, photo_url FROM dogs');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all dogs:', error);
    res.status(500).json({ error: `Database error while fetching dogs: ${error.message}` });
  }
});

module.exports = router;