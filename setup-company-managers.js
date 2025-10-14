import { db } from './server/db.js';
import { users } from './shared/schema.js';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

async function setupCompanyManagers() {
  try {
    console.log('🏢 إضافة مدراء الشركات للنظام...');

    // Get all companies
    const companies = await db.query.companies.findMany();
    console.log(`📋 العثور على ${companies.length} شركات`);

    const managersToAdd = [
      // مدير شركة الألبان والأغذية الوطنية الحديدة
      {
        username: 'nadfood_manager',
        password: 'HSA2025@nadfood',
        fullName: 'مدير الألبان والأغذية الوطنية الحديدة',
        companyId: 2,
        role: 'admin',
        permissions: [
          'manage_users',
          'manage_locations', 
          'view_all_evaluations',
          'export_reports',
          'manage_templates',
          'view_analytics',
          'manage_company_settings',
          'full_system_access'
        ]
      },
      // مدير الشؤون الإدارية الاستراتيجية
      {
        username: 'strategic_manager',
        password: 'HSA2025@strategic',
        fullName: 'مدير الشؤون الإدارية الاستراتيجية',
        companyId: 1,
        role: 'admin',
        permissions: [
          'manage_users',
          'manage_locations',
          'view_all_evaluations', 
          'export_reports',
          'manage_templates',
          'view_analytics',
          'manage_company_settings',
          'full_system_access'
        ]
      },
      // مدير شركة البسكويت والحلويات
      {
        username: 'biscuits_manager',
        password: 'HSA2025@biscuits',
        fullName: 'مدير شركة البسكويت والحلويات',
        companyId: 3,
        role: 'admin',
        permissions: [
          'manage_users',
          'manage_locations',
          'view_all_evaluations',
          'export_reports', 
          'manage_templates',
          'view_analytics',
          'manage_company_settings',
          'full_system_access'
        ]
      }
    ];

    for (const managerData of managersToAdd) {
      try {
        // Check if manager already exists
        const existingManager = await db.query.users.findFirst({
          where: eq(users.username, managerData.username)
        });

        if (existingManager) {
          console.log(`⚠️ المدير ${managerData.fullName} موجود مسبقاً`);
          
          // Update permissions to ensure full access
          await db.update(users)
            .set({
              permissions: managerData.permissions,
              role: 'admin',
              fullName: managerData.fullName,
              companyId: managerData.companyId,
              lastLogin: new Date().toISOString()
            })
            .where(eq(users.id, existingManager.id));
            
          console.log(`✅ تم تحديث صلاحيات ${managerData.fullName}`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(managerData.password, 10);

        // Add new manager
        const [newManager] = await db.insert(users).values({
          username: managerData.username,
          password: hashedPassword,
          fullName: managerData.fullName,
          companyId: managerData.companyId,
          role: managerData.role,
          permissions: managerData.permissions,
          lastLogin: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }).returning();

        console.log(`✅ تم إضافة المدير: ${managerData.fullName}`);
        console.log(`   📧 اسم المستخدم: ${managerData.username}`);
        console.log(`   🔑 كلمة المرور: ${managerData.password}`);
        console.log(`   🏢 الشركة: ${companies.find(c => c.id === managerData.companyId)?.nameAr || 'غير محدد'}`);
        console.log(`   🛡️ الصلاحيات: ${managerData.permissions.length} صلاحية كاملة`);

      } catch (error) {
        console.error(`❌ خطأ في إضافة المدير ${managerData.fullName}:`, error);
      }
    }

    console.log('\n📊 ملخص العملية:');
    const allManagers = await db.query.users.findMany({
      where: eq(users.role, 'admin')
    });
    
    console.log(`👥 إجمالي المدراء في النظام: ${allManagers.length}`);
    console.log('📋 قائمة المدراء:');
    
    for (const manager of allManagers) {
      const company = companies.find(c => c.id === manager.companyId);
      console.log(`   • ${manager.fullName} (@${manager.username}) - ${company?.nameAr || 'غير محدد'}`);
      console.log(`     صلاحيات: ${Array.isArray(manager.permissions) ? manager.permissions.length : 0}`);
    }

    console.log('\n🎯 النتيجة: يمكن لمدير بيئة العمل الآن إعادة تعيين كلمات مرور هؤلاء المدراء');

  } catch (error) {
    console.error('❌ خطأ في إعداد مدراء الشركات:', error);
  }
}

// Run the setup
setupCompanyManagers()
  .then(() => {
    console.log('✅ تم إنجاز إعداد مدراء الشركات بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل في إعداد مدراء الشركات:', error);
    process.exit(1);
  });