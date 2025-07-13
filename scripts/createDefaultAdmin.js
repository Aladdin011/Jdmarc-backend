const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

require("dotenv").config();
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

const createAdmin = async () => {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE email = ?",
      ["admin@jdmarcng.com"]
    );

    if (rows.length > 0) {
      console.log("✅ Admin already exists. Skipping creation.");
      return;
    }

    const hashedPassword = await bcrypt.hash("SecurePass123", 10);

    await connection.execute(
      `INSERT INTO users (username, email, password, role)
       VALUES (?, ?, ?, ?)`,
      ["Default Admin", "admin@jdmarcng.com", hashedPassword, "admin"]
    );

    console.log("✅ Default admin created: admin@jdmarcng.com / SecurePass123");
  } catch (err) {
    console.error("❌ Error creating admin:", err.message);
  } finally {
    await connection.end();
  }
};

createAdmin();
