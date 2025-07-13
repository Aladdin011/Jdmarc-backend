const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../db');

// Helper function for standardized error responses
const createErrorResponse = (statusCode, message, error = null) => {
  if (error) {
    logger.error(`${message}: ${error.message}`, { stack: error.stack });
  }
  return { status: statusCode, error: message };
};

// Helper function to generate staff codes
const generateCode = (dept) => {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const shortDept = dept.slice(0, 3).toUpperCase();
  return `${randomDigits}-${shortDept}`;
};

// POST /api/kyc/validate - Validate staff code for department
router.post('/validate', async (req, res) => {
  try {
    const { code, department } = req.body;

    if (!code || !department) {
      return res.status(400).json(
        createErrorResponse(400, 'Staff code and department are required')
      );
    }

    // First check if the code exists and matches the department
    const [rows] = await db.promise().query(
      "SELECT * FROM staff_codes WHERE code = ? AND department = ? AND used = FALSE",
      [code, department]
    );

    if (rows.length === 0) {
      return res.json({ 
        valid: false,
        message: "Invalid staff code or code already used"
      });
    }

    // Mark the code as used
    await db.promise().query(
      "UPDATE staff_codes SET used = TRUE WHERE code = ?",
      [code]
    );

    logger.info(`Staff code validated successfully: ${code} for department: ${department}`);

    return res.json({ 
      valid: true,
      message: "Staff code validated successfully"
    });
  } catch (error) {
    const errorResponse = createErrorResponse(500, 'KYC validation failed', error);
    res.status(500).json(errorResponse);
  }
});

// GET /api/kyc/departments - Get available departments with unused codes
router.get('/departments', async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      "SELECT DISTINCT department FROM staff_codes WHERE used = FALSE"
    );
    
    const departments = rows.map(row => row.department);
    return res.json({ departments });
  } catch (err) {
    logger.error('Get departments error:', err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/kyc/generate - Admin endpoint to generate new staff codes
router.post('/generate', async (req, res) => {
  const { department, count = 1 } = req.body;
  
  if (!department) {
    return res.status(400).json({ error: "Department is required" });
  }

  try {
    const generatedCodes = [];
    
    for (let i = 0; i < count; i++) {
      const code = generateCode(department);
      
      await db.promise().query(
        "INSERT INTO staff_codes (code, department) VALUES (?, ?)",
        [code, department]
      );
      
      generatedCodes.push(code);
    }

    logger.info(`Generated ${count} staff code(s) for ${department}`);

    return res.json({ 
      message: `Generated ${count} staff code(s) for ${department}`,
      codes: generatedCodes
    });
  } catch (err) {
    logger.error('Generate codes error:', err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router; 