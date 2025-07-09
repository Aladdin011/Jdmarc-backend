// Script to create a default admin user if not exists
const bcrypt = require("bcryptjs");
const db = require("./db");

const DEFAULT_ADMIN = {
  username: "admin",
  email: "admin@jdmarc.com",
  password: "admin1234",
  role: "admin"
};

async function createAdmin() {
  try {
    const [existing] = await db.promise().query(
      "SELECT * FROM users WHERE email = ?",
      [DEFAULT_ADMIN.email]
    );
    if (existing.length > 0) {
      console.log("✅ Default admin already exists.");
      process.exit(0);
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, salt);
    await db.promise().query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
      [DEFAULT_ADMIN.username, DEFAULT_ADMIN.email, hashedPassword, DEFAULT_ADMIN.role]
    );
    console.log("🎉 Default admin created:");
    console.log(`Email: ${DEFAULT_ADMIN.email}\nPassword: ${DEFAULT_ADMIN.password}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating admin:", err);
    process.exit(1);
  }
}

createAdmin();
