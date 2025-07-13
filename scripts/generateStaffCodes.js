const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jdmarc_db',
  port: process.env.DB_PORT || 3306
};

// Department configurations
const departments = [
  'Engineering',
  'Finance', 
  'Human Resources',
  'Marketing',
  'Sales',
  'Operations'
];

// Generate a random staff code
const generateCode = (dept) => {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const shortDept = dept.slice(0, 3).toUpperCase();
  return `${randomDigits}-${shortDept}`;
};

// Generate codes for all departments
const generateAllCodes = async (codesPerDept = 5) => {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Connected to database');
    
    // Check if staff_codes table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'staff_codes'"
    );
    
    if (tables.length === 0) {
      console.log('❌ staff_codes table not found. Please run the database schema first.');
      return;
    }
    
    console.log(`🎯 Generating ${codesPerDept} codes per department...`);
    
    for (const dept of departments) {
      console.log(`\n📝 Generating codes for ${dept}...`);
      
      for (let i = 0; i < codesPerDept; i++) {
        const code = generateCode(dept);
        
        try {
          await connection.execute(
            "INSERT INTO staff_codes (code, department) VALUES (?, ?)",
            [code, dept]
          );
          console.log(`  ✅ Generated: ${code}`);
        } catch (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            console.log(`  ⚠️  Code already exists: ${code} (retrying...)`);
            i--; // Retry this iteration
          } else {
            console.error(`  ❌ Error generating code for ${dept}:`, err.message);
          }
        }
      }
    }
    
    // Show summary
    console.log('\n📊 Summary:');
    for (const dept of departments) {
      const [rows] = await connection.execute(
        "SELECT COUNT(*) as count FROM staff_codes WHERE department = ? AND used = FALSE",
        [dept]
      );
      console.log(`  ${dept}: ${rows[0].count} available codes`);
    }
    
    console.log('\n🎉 Staff code generation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
};

// Generate codes for specific department
const generateCodesForDepartment = async (department, count = 5) => {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log(`🎯 Generating ${count} codes for ${department}...`);
    
    for (let i = 0; i < count; i++) {
      const code = generateCode(department);
      
      try {
        await connection.execute(
          "INSERT INTO staff_codes (code, department) VALUES (?, ?)",
          [code, department]
        );
        console.log(`  ✅ Generated: ${code}`);
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  ⚠️  Code already exists: ${code} (retrying...)`);
          i--; // Retry this iteration
        } else {
          console.error(`  ❌ Error generating code:`, err.message);
        }
      }
    }
    
    console.log(`\n🎉 Generated ${count} codes for ${department}!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
};

// Show available codes
const showAvailableCodes = async () => {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('\n📋 Available Staff Codes:');
    console.log('========================');
    
    for (const dept of departments) {
      const [rows] = await connection.execute(
        "SELECT code FROM staff_codes WHERE department = ? AND used = FALSE ORDER BY code",
        [dept]
      );
      
      if (rows.length > 0) {
        console.log(`\n${dept}:`);
        rows.forEach(row => console.log(`  ${row.code}`));
      } else {
        console.log(`\n${dept}: No available codes`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Main execution
const main = () => {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'generate':
      const department = args[1];
      const count = parseInt(args[2]) || 5;
      
      if (department) {
        if (departments.includes(department)) {
          generateCodesForDepartment(department, count);
        } else {
          console.log('❌ Invalid department. Available departments:');
          departments.forEach(dept => console.log(`  - ${dept}`));
        }
      } else {
        generateAllCodes(count);
      }
      break;
      
    case 'show':
      showAvailableCodes();
      break;
      
    default:
      console.log('🎯 JD Marc Staff Code Generator');
      console.log('================================');
      console.log('');
      console.log('Usage:');
      console.log('  node generateStaffCodes.js generate                    # Generate codes for all departments');
      console.log('  node generateStaffCodes.js generate <dept>           # Generate codes for specific department');
      console.log('  node generateStaffCodes.js generate <dept> <count>   # Generate specific number of codes');
      console.log('  node generateStaffCodes.js show                      # Show available codes');
      console.log('');
      console.log('Available departments:');
      departments.forEach(dept => console.log(`  - ${dept}`));
      break;
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateAllCodes,
  generateCodesForDepartment,
  showAvailableCodes,
  generateCode
}; 