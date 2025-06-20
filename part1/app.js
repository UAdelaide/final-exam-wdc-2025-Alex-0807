/* eslint-disable */
const express = require('express');

const mysql = require('mysql2/promise');

const app = express();
const port = 8080;

// --- 数据库连接配置 ---
// 在实际应用中，这些信息应该来自环境变量
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'YOUR PASSWORD',
  database: 'dogwalks',      // 确保 CREATE DATABASE dogwalks; 已执行
  waitForConnections: true,
  connectionLimit: 10
});

// --- 中间件 ---
app.use(express.json());

// --- 数据库初始化函数 ---
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('Setting up database...');
    // 创建表
    await client.query(`
      DROP TABLE IF EXISTS ratings;
      DROP TABLE IF EXISTS walk_requests;
      DROP TABLE IF EXISTS dogs;
      DROP TABLE IF EXISTS users;

      CREATE TABLE users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'walker'))
      );

      CREATE TABLE dogs (
        dog_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        size VARCHAR(50),
        owner_id INTEGER NOT NULL REFERENCES users(user_id)
      );

      CREATE TABLE walk_requests (
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        dog_id INTEGER NOT NULL REFERENCES dogs(dog_id),
        request_time TIMESTAMP NOT NULL,
        duration_minutes INTEGER NOT NULL,
        location VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL ENUM  ('open', 'accepted', 'completed', 'cancelled'),
        walker_id INTEGER REFERENCES users(user_id)
      );

      CREATE TABLE ratings (
          rating_id INT AUTO_INCREMENT PRIMARY KEY,
          walk_request_id INTEGER UNIQUE NOT NULL REFERENCES walk_requests(request_id),
          rated_user_id INTEGER NOT NULL REFERENCES users(user_id), -- 被评分的用户 (遛狗员)
          rated_by_id INTEGER NOT NULL REFERENCES users(user_id), -- 评分的用户 (主人)
          rating INTEGER NOT NULL ENUM (rating >= 1 AND rating <= 5)
      );
    `);

    // 插入种子数据
    await client.query(`
      INSERT INTO users (username, email, password_hash, role) VALUES
      ('alice123', 'alice@example.com', 'hashed123', 'owner'),
      ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
      ('carol123', 'carol@example.com', 'hashed789', 'owner'),
      ('emilywong', 'emily@example.com', 'hashed112', 'walker');

      INSERT INTO dogs (name, size, owner_id) VALUES
      ('Max', 'medium', (SELECT user_id FROM users WHERE username = 'alice123')),
      ('Bella', 'small', (SELECT user_id FROM users WHERE username = 'carol123')),
      ('Rocky', 'small', (SELECT user_id FROM users WHERE username = 'alice123'));

      INSERT INTO walk_requests (dog_id, request_time, duration_minutes, location, status, walker_id) VALUES
      -- Open request
      ((SELECT dog_id FROM dogs WHERE name = 'Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open', NULL),
      -- Completed walks for bobwalker
      ((SELECT dog_id FROM dogs WHERE name = 'Bella'), '2025-05-20 14:00:00', 45, 'Green Valley', 'completed', (SELECT user_id FROM users WHERE username = 'bobwalker')),
      ((SELECT dog_id FROM dogs WHERE name = 'Rocky'), '2025-05-21 09:00:00', 30, 'River Path', 'completed', (SELECT user_id FROM users WHERE username = 'bobwalker'));

      INSERT INTO ratings (walk_request_id, rated_user_id, rated_by_id, rating) VALUES
      (
        (SELECT request_id FROM walk_requests WHERE dog_id = (SELECT dog_id FROM dogs WHERE name = 'Bella')),
        (SELECT user_id FROM users WHERE username = 'bobwalker'),
        (SELECT user_id FROM users WHERE username = 'carol123'),
        5
      ),
      (
        (SELECT request_id FROM walk_requests WHERE dog_id = (SELECT dog_id FROM dogs WHERE name = 'Rocky')),
        (SELECT user_id FROM users WHERE username = 'bobwalker'),
        (SELECT user_id FROM users WHERE username = 'alice123'),
        4
      );
    `);

    console.log('Database setup complete.');
  } finally {
    client.release();
  }
};


// --- API 端点 ---

// 1. 获取所有狗的信息
app.get('/api/dogs', async (req, res) => {
  try {
    const query = `
      SELECT
        d.name AS dog_name,
        d.size,
        u.username AS owner_username
      FROM dogs d
      JOIN users u ON d.owner_id = u.user_id;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching dogs:', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. 获取所有开放的遛狗请求
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const query = `
      SELECT
        wr.request_id,
        d.name AS dog_name,
        wr.request_time,
        wr.duration_minutes,
        wr.location,
        u.username AS owner_username
      FROM walk_requests wr
      JOIN dogs d ON wr.dog_id = d.dog_id
      JOIN users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open';
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching open walk requests:', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. 获取每个遛狗员的总结
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const query = `
      SELECT
        u.username AS walker_username,
        COALESCE(ratings_summary.total_ratings, 0) AS total_ratings,
        ratings_summary.average_rating,
        COALESCE(completed_walks_summary.completed_walks, 0) AS completed_walks
      FROM users u
      LEFT JOIN (
        SELECT
          rated_user_id,
          COUNT(rating_id)::INTEGER AS total_ratings,
          AVG(rating) AS average_rating
        FROM ratings
        GROUP BY rated_user_id
      ) AS ratings_summary ON u.user_id = ratings_summary.rated_user_id
      LEFT JOIN (
        SELECT
          walker_id,
          COUNT(request_id)::INTEGER AS completed_walks
        FROM walk_requests
        WHERE status = 'completed'
        GROUP BY walker_id
      ) AS completed_walks_summary ON u.user_id = completed_walks_summary.walker_id
      WHERE u.role = 'walker';
    `;
    const { rows } = await pool.query(query);

    // 将数据库返回的字符串类型转换为正确的数字类型
    const summary = rows.map(row => ({
      ...row,
      average_rating: row.average_rating ? parseFloat(row.average_rating) : null,
    }));

    res.json(summary);
  } catch (err) {
    console.error('Error fetching walkers summary:', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// --- 服务器初始化 ---
const startServer = async () => {
  try {
    // 1. 设置数据库 (创建表和插入数据)
    await setupDatabase();

    // 2. 启动 Express 服务器
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
      console.log('API endpoints are available at:');
      console.log(`- GET http://localhost:${port}/api/dogs`);
      console.log(`- GET http://localhost:${port}/api/walkrequests/open`);
      console.log(`- GET http://localhost:${port}/api/walkers/summary`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.stack);
    pool.end(); // 启动失败时关闭连接池
  }
};

startServer();