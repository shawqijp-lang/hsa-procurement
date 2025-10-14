import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

async function resetAdminPassword() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔧 إعادة تعيين كلمة المرور للمستخدم الإداري...');
    
    // Hash the new password
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the admin user password
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2 AND role = $3 RETURNING id, username, role',
      [hashedPassword, 'owner', 'admin']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ تم تحديث كلمة المرور بنجاح للمستخدم:', result.rows[0]);
      console.log('🔑 بيانات الدخول الجديدة:');
      console.log('   اسم المستخدم: owner');
      console.log('   كلمة المرور: admin123');
      console.log('   الشركة: 6');
    } else {
      console.log('❌ لم يتم العثور على المستخدم الإداري');
    }
    
    // Also check if there are other admin users
    const allAdmins = await pool.query(
      'SELECT id, username, role, company_id FROM users WHERE role IN ($1, $2, $3)',
      ['admin', 'owner', 'super_admin']
    );
    
    console.log('📋 جميع المستخدمين الإداريين:');
    allAdmins.rows.forEach(user => {
      console.log(`   - ${user.username} (${user.role}) - شركة ${user.company_id}`);
    });
    
  } catch (error) {
    console.error('❌ خطأ في إعادة تعيين كلمة المرور:', error);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();