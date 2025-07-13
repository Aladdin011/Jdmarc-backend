const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  multipleStatements: true // Required for running multiple SQL statements
};

async function initializeDatabase() {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    logger.info(`Database ${process.env.DB_NAME} created or already exists`);

    // Use the database
    await connection.query(`USE ${process.env.DB_NAME}`);

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    
    // Split the SQL file into individual statements
    const statements = schemaSql
      .split(';')
      .filter(statement => statement.trim().length > 0);

    // Execute each statement separately
    for (const statement of statements) {
      await connection.query(statement);
    }
    
    logger.info('Database schema created successfully');

    // Create default admin user if it doesn't exist
    const defaultAdmin = {
      username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
      role: 'admin'
    };

    // Check if admin exists
    const [existingAdmin] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [defaultAdmin.email]
    );

    if (existingAdmin.length === 0) {
      // Hash password
      const hashedPassword = await bcrypt.hash(defaultAdmin.password, 12);

      // Insert admin user
      await connection.query(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [defaultAdmin.username, defaultAdmin.email, hashedPassword, defaultAdmin.role]
      );

      logger.info('Default admin user created successfully');
    } else {
      logger.info('Default admin user already exists');
    }

    // Create some example data for testing
    await createExampleData(connection);

    logger.info('Database initialization completed successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function createExampleData(connection) {
  try {
    // Create a test user if it doesn't exist
    const testUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: await bcrypt.hash('test123', 12),
      role: 'staff'
    };

    const [existingUser] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [testUser.email]
    );

    let userId;
    if (existingUser.length === 0) {
      const [result] = await connection.query(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [testUser.username, testUser.email, testUser.password, testUser.role]
      );
      userId = result.insertId;
      logger.info('Test user created successfully');
    } else {
      userId = existingUser[0].id;
    }

    // Create some example tasks
    const tasks = [
      {
        title: 'Complete project documentation',
        description: 'Write comprehensive documentation for the project',
        status: 'pending',
        priority: 'high',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      {
        title: 'Review code changes',
        description: 'Review and approve pending pull requests',
        status: 'in_progress',
        priority: 'medium',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
      }
    ];

    for (const task of tasks) {
      await connection.query(
        'INSERT IGNORE INTO tasks (user_id, title, description, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, task.title, task.description, task.status, task.priority, task.due_date]
      );
    }

    // Create some example notifications
    const notifications = [
      {
        title: 'Welcome!',
        message: 'Welcome to the system. Get started by completing your profile.',
        type: 'info'
      },
      {
        title: 'Task Due Soon',
        message: 'You have a task due in the next 24 hours.',
        type: 'warning'
      }
    ];

    for (const notification of notifications) {
      await connection.query(
        'INSERT IGNORE INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [userId, notification.title, notification.message, notification.type]
      );
    }

    logger.info('Example data created successfully');
  } catch (error) {
    logger.error('Failed to create example data:', error);
    throw error;
  }
}

// Run the initialization
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      logger.info('Database setup completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = initializeDatabase;