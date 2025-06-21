/* eslint-disable */

const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all walk requests (for walkers to view)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT wr.*, d.name AS dog_name, d.size, u.username AS owner_name
      FROM walk_requests wr
      JOIN dogs d ON wr.dog_id = d.dog_id
      JOIN users u ON d.owner_id = u.user_id
      WHERE wr.status IN ('open', 'completed')
    `);
    res.json(rows);
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Failed to fetch walk requests' });
  }
});

// POST a new walk request (from owner)
router.post('/', async (req, res) => {
  const { dog_id, requested_time, duration_minutes, location } = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO walk_requests (dog_id, request_time, duration_minutes, location, status)
      VALUES (?, ?, ?, ?, 'open')
    `, [dog_id, requested_time, duration_minutes, location]);

    res.status(201).json({ message: 'Walk request created', request_id: result.insertId });
  } catch (error) {
    console.error('SQL Error creating walk request:', error);
    res.status(500).json({ error: `Failed to create walk request: ${error.message}` });
  }
});

// POST an application to walk a dog (from walker)
router.post('/:id/apply', async (req, res) => {
  const requestId = req.params.id;
  const walkerId = req.session.user ? req.session.user.user_id : null;

  if (!walkerId) {
    return res.status(401).json({ error: 'User not logged in or not a walker' });
  }

  try {
    const [result] = await db.query(`
      UPDATE walk_requests
      SET status = 'accepted', walker_id = ?
      WHERE request_id = ? AND status = 'open'
    `, [walkerId, requestId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Walk not found or already taken' });
    }

    res.status(200).json({ message: 'Application submitted and approved' });
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: `Failed to apply for walk: ${error.message}` });
  }
});

// [新增] 获取当前登录主人自己的所有 walk 请求
router.get('/my-requests', async (req, res) => {
  // 检查用户是否登录且角色是否为 owner
  if (!req.session.user || req.session.user.role !== 'owner') {
    return res.status(401).json({ error: 'Unauthorized: Not logged in as an owner' });
  }

  const ownerId = req.session.user.user_id;

  try {
   
    const [rows] = await db.query(`
      SELECT wr.*, d.name AS dog_name, d.size
      FROM walk_requests wr
      JOIN dogs d ON wr.dog_id = d.dog_id
      WHERE d.owner_id = ?
      ORDER BY wr.request_time DESC
    `, [ownerId]);
    res.json(rows);
  } catch (error) {
    console.error('SQL Error fetching owner walks:', error);
    res.status(500).json({ error: `Failed to fetch your walk requests: ${error.message}` });
  }
});

module.exports = router;