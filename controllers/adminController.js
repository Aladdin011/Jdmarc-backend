const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.createAdmin = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      role = 'staff',
      department,
      phone 
    } = req.body;

    // Validate required fields
    if (!firstName || !email || !password) {
      return res.status(400).json({ 
        message: "Missing required fields: firstName, email, and password are required" 
      });
    }

    // Validate role
    const validRoles = ['admin', 'staff', 'employer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        message: "Invalid role. Must be one of: admin, staff, employer" 
      });
    }

    // Check if user already exists
    const [existingUsers] = await db.promise().query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ 
        message: "User with this email already exists" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with role assignment
    const [result] = await db.promise().query(
      'INSERT INTO users (username, email, password, role, department, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [email, email, hashedPassword, role, department || null, phone || null]
    );

    logger.info(`New user created by admin: ${email} with role: ${role}`);

    res.status(201).json({
      message: "User created successfully",
      admin: {
        id: result.insertId,
        email: email,
        role: role,
      },
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ 
      message: "Failed to create user. Please try again.",
      error: error.message 
    });
  }
};
// controllers/adminController.js

exports.getAllUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};

exports.updateUserRole = async (req, res) => {
  const { role } = req.body;
  const validRoles = ["admin", "staff", "employer"];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  ).select("-password");

  if (!user) return res.status(404).json({ message: "User not found" });

  res.json({ message: "Role updated", user });
};

exports.deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ message: "User deleted" });
};

// Get admin dashboard statistics
exports.getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const admins = await User.countDocuments({ role: 'admin' });
    const employers = await User.countDocuments({ role: 'employer' });
    const staff = await User.countDocuments({ role: 'staff' });

    res.json({
      totalUsers,
      admins,
      employers,
      staff
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch admin stats", error: error.message });
  }
};

// Get admin tasks
exports.getAdminTasks = async (req, res) => {
  try {
    // For now, return sample tasks. In a real app, you'd fetch from a tasks collection
    const tasks = [
      { id: 1, title: "Review Lagos Bridge plan", status: "done" },
      { id: 2, title: "Finalize housing bid", status: "pending" },
      { id: 3, title: "Approve solar grid proposal", status: "done" },
      { id: 4, title: "Review quarterly reports", status: "pending" },
      { id: 5, title: "Update security protocols", status: "pending" }
    ];

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch admin tasks", error: error.message });
  }
};
