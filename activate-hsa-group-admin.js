const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function activateHSAGroupAdmin() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔌 Connected to database');

    // Hash the password
    const password = 'HSA2025@admin';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔑 Password hashed');

    // Update the user
    const result = await client.query(`
      UPDATE users 
      SET password = $1, is_active = true
      WHERE username = 'hsa_group_admin'
      RETURNING id, username, role, is_active
    `, [hashedPassword]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ HSA Group Admin activated successfully:');
      console.log('📋 User Details:');
      console.log(`   Username: ${user.username}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.is_active}`);
      console.log(`   Password: ${password}`);
      console.log('');
      console.log('🔧 Permissions:');
      console.log('   ✅ View all companies data');
      console.log('   ✅ View all locations');
      console.log('   ✅ View all reports');
      console.log('   ✅ Access dashboard with company filter');
      console.log('   ❌ Cannot create/edit/delete users');
      console.log('   ❌ Cannot modify locations');
      console.log('   ❌ Cannot change system settings');
      console.log('');
      console.log('🚀 Ready to use! Login credentials:');
      console.log(`   Username: hsa_group_admin`);
      console.log(`   Password: HSA2025@admin`);
    } else {
      console.log('❌ User hsa_group_admin not found');
    }

  } catch (error) {
    console.error('❌ Error activating HSA Group Admin:', error);
  } finally {
    await client.end();
  }
}

activateHSAGroupAdmin();