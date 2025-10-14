import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import ws from "ws";
import { users } from "./shared/schema.ts";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { users } });

async function resetGeneralManagerPassword() {
  console.log('🔄 بدء إعادة تعيين كلمة مرور مدير عام المجموعة...');
  
  try {
    // البحث عن مدير عام المجموعة
    const [generalManager] = await db
      .select()
      .from(users)
      .where(eq(users.username, 'general_manager'));
    
    if (!generalManager) {
      console.log('❌ لم يتم العثور على مدير عام المجموعة');
      console.log('🆕 إنشاء حساب مدير عام المجموعة...');
      
      // إنشاء حساب مدير عام المجموعة
      const hashedPassword = await bcrypt.hash('GM2025@HSA', 10);
      
      const [newGeneralManager] = await db
        .insert(users)
        .values({
          username: 'general_manager',
          password: hashedPassword,
          fullName: 'مدير عام المجموعة',
          role: 'general_manager',
          companyId: null, // مدير عام المجموعة لا ينتمي لشركة محددة
          isActive: true
        })
        .returning();
      
      console.log('✅ تم إنشاء حساب مدير عام المجموعة بنجاح');
      console.log('📋 تفاصيل الحساب:');
      console.log(`   - اسم المستخدم: ${newGeneralManager.username}`);
      console.log(`   - الاسم الكامل: ${newGeneralManager.fullName}`);
      console.log(`   - الدور: ${newGeneralManager.role}`);
      console.log(`   - كلمة المرور: GM2025@HSA`);
      
    } else {
      console.log('✅ تم العثور على مدير عام المجموعة');
      console.log(`📋 الحساب الحالي: ${generalManager.username} - ${generalManager.fullName}`);
      
      // إعادة تعيين كلمة المرور
      const newPassword = 'GM2025@HSA';
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await db
        .update(users)
        .set({ 
          password: hashedPassword,
          isActive: true
        })
        .where(eq(users.id, generalManager.id));
      
      console.log('✅ تم إعادة تعيين كلمة المرور بنجاح');
      console.log('📋 بيانات الدخول المحدثة:');
      console.log(`   - اسم المستخدم: ${generalManager.username}`);
      console.log(`   - كلمة المرور الجديدة: ${newPassword}`);
    }
    
    console.log('\n🔐 معلومات هامة:');
    console.log('   - يرجى حفظ كلمة المرور في مكان آمن');
    console.log('   - ينصح بتغيير كلمة المرور بعد تسجيل الدخول الأول');
    console.log('   - مدير عام المجموعة له صلاحيات شاملة على جميع الشركات');
    
  } catch (error) {
    console.error('❌ خطأ في إعادة تعيين كلمة مرور مدير عام المجموعة:', error);
  } finally {
    await pool.end();
    console.log('✅ تم إنهاء الاتصال بقاعدة البيانات');
  }
}

// تشغيل السكريبت
resetGeneralManagerPassword().catch(console.error);