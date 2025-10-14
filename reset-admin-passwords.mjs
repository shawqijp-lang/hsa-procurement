import bcrypt from 'bcrypt';
import pg from 'pg';
const { Client } = pg;

async function resetPasswords() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  try {
    console.log('إعادة تعيين كلمات مرور المدراء...');
    
    // كلمة مرور المدير العام
    const superAdminHash = await bcrypt.hash('SuperAdmin@2025', 10);
    await client.query('UPDATE users SET password = $1 WHERE username = $2', 
      [superAdminHash, 'hsa_group_admin']);
    
    // كلمة مرور مدير الشركة
    const adminHash = await bcrypt.hash('Admin@2025', 10);
    await client.query('UPDATE users SET password = $1 WHERE username = $2', 
      [adminHash, 'Abdusaeed']);
    
    console.log('✅ تم تحديث كلمات المرور بنجاح');
    console.log('المدير العام: hsa_group_admin / SuperAdmin@2025');
    console.log('مدير الشركة: Abdusaeed / Admin@2025');
    
  } catch (error) {
    console.error('خطأ:', error);
  } finally {
    await client.end();
  }
}

resetPasswords();
