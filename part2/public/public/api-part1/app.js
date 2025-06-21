const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const port = 8080;

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',      // MySQL user name
  password: '0615',
  database: 'dogwalks'
};

let db;

// 数据库初始化
async function setupDatabase() {
  // Connect to MySQL server without selecting a database to create it if it doesn't exist
  const { database, ...rootConfig } = dbConfig;
  const tempConnection = await mysql.createConnection(rootConfig);
  await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await tempConnection.end();

  // Now connect to the newly created database
  db = await mysql.createConnection(dbConfig);

  // 创建表
  await db.execute(`DROP TABLE IF EXISTS ratings`);
  await db.execute(`DROP TABLE IF EXISTS walk_requests`);
  await db.execute(`DROP TABLE IF EXISTS dogs`);
  await db.execute(`DROP TABLE IF EXISTS users`);

  await db.execute(`
    CREATE TABLE users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE dogs (
      dog_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      size VARCHAR(50),
      owner_id INT NOT NULL,
      photo_url VARCHAR(2048),
      FOREIGN KEY (owner_id) REFERENCES users(user_id)
    )
  `);

  await db.execute(`
    CREATE TABLE walk_requests (
      request_id INT AUTO_INCREMENT PRIMARY KEY,
      dog_id INT NOT NULL,
      request_time DATETIME NOT NULL,
      duration_minutes INT NOT NULL,
      location VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      walker_id INT,
      FOREIGN KEY (dog_id) REFERENCES dogs(dog_id),
      FOREIGN KEY (walker_id) REFERENCES users(user_id)
    )
  `);

  await db.execute(`
    CREATE TABLE ratings (
      rating_id INT AUTO_INCREMENT PRIMARY KEY,
      walk_request_id INT UNIQUE NOT NULL,
      rated_user_id INT NOT NULL,
      rated_by_id INT NOT NULL,
      rating INT NOT NULL,
      FOREIGN KEY (walk_request_id) REFERENCES walk_requests(request_id),
      FOREIGN KEY (rated_user_id) REFERENCES users(user_id),
      FOREIGN KEY (rated_by_id) REFERENCES users(user_id)
    )
  `);

  // 插入测试数据 - [已修复]
  // 将哈希密码替换为可用的明文密码，以便登录功能可以正常工作
  await db.execute(`
    INSERT INTO users (username, email, password_hash, role) VALUES
    ('alice123', 'alice@example.com', 'password123', 'owner'),
    ('bobwalker', 'bob@example.com', 'password456', 'walker'),
    ('carol123', 'carol@example.com', 'password789', 'owner'),
    ('emilywong', 'emily@example.com', 'password112', 'walker')
  `);

  await db.execute(`
    INSERT INTO dogs (name, size, owner_id, photo_url) VALUES
    ('Max', 'medium', (SELECT user_id FROM users WHERE username = 'alice123'), 'https://images.dog.ceo/breeds/beagle/n02088364_11137.jpg'),
    ('Bella', 'small', (SELECT user_id FROM users WHERE username = 'carol123'), 'https://images.dog.ceo/breeds/chihuahua/n02085620_3226.jpg'),
    ('Rocky', 'small', (SELECT user_id FROM users WHERE username = 'alice123'), 'https://images.dog.ceo/breeds/boxer/n02108089_11106.jpg')
  `);

  await db.execute(`
    INSERT INTO walk_requests (dog_id, request_time, duration_minutes, location, status, walker_id) VALUES
    ((SELECT dog_id FROM dogs WHERE name = 'Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open', NULL),
    ((SELECT dog_id FROM dogs WHERE name = 'Bella'), '2025-05-20 14:00:00', 45, 'Green Valley', 'completed', (SELECT user_id FROM users WHERE username = 'bobwalker')),
    ((SELECT dog_id FROM dogs WHERE name = 'Rocky'), '2025-05-21 09:00:00', 30, 'River Path', 'completed', (SELECT user_id FROM users WHERE username = 'bobwalker'))
  `);

  await db.execute(`
    INSERT INTO ratings (walk_request_id, rated_user_id, rated_by_id, rating) VALUES
    ((SELECT request_id FROM walk_requests WHERE dog_id = (SELECT dog_id FROM dogs WHERE name = 'Bella')), (SELECT user_id FROM users WHERE username = 'bobwalker'), (SELECT user_id FROM users WHERE username = 'carol123'), 5),
    ((SELECT request_id FROM walk_requests WHERE dog_id = (SELECT dog_id FROM dogs WHERE name = 'Rocky')), (SELECT user_id FROM users WHERE username = 'bobwalker'), (SELECT user_id FROM users WHERE username = 'alice123'), 4)
  `);

  console.log('数据库初始化完成');
}

// API端点

// 1. /api/dogs
app.get('/api/dogs', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM dogs d
      JOIN users u ON d.owner_id = u.user_id
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching dogs:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. /api/walkrequests/open
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT wr.request_id, d.name AS dog_name, wr.request_time, wr.duration_minutes, wr.location, u.username AS owner_username
      FROM walk_requests wr
      JOIN dogs d ON wr.dog_id = d.dog_id
      JOIN users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching open walk requests:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. /api/walkers/summary
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        u.username AS walker_username,
        IFNULL(ratings_summary.total_ratings, 0) AS total_ratings,
        ratings_summary.average_rating,
        IFNULL(completed_walks_summary.completed_walks, 0) AS completed_walks
      FROM users u
      LEFT JOIN (
        SELECT
          rated_user_id,
          COUNT(rating_id) AS total_ratings,
          AVG(rating) AS average_rating
        FROM ratings
        GROUP BY rated_user_id
      ) AS ratings_summary ON u.user_id = ratings_summary.rated_user_id
      LEFT JOIN (
        SELECT
          walker_id,
          COUNT(request_id) AS completed_walks
        FROM walk_requests
        WHERE status = 'completed'
        GROUP BY walker_id
      ) AS completed_walks_summary ON u.user_id = completed_walks_summary.walker_id
      WHERE u.role = 'walker'
    `);

    // 处理平均分为数字类型
    const summary = rows.map(row => ({
      ...row,
      average_rating: row.average_rating !== null ? Number(row.average_rating) : null
    }));

    res.json(summary);
  } catch (err) {
    console.error('Error fetching walkers summary:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 启动服务器
(async () => {
  try {
    await setupDatabase();
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
})();