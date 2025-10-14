#!/usr/bin/env node

/**
 * سكريبت إعداد البيانات الأساسية للإنتاج
 * يعمل تلقائياً عند بدء تشغيل الخادم لأول مرة
 */

import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

async function setupProductionData(pool) {
  console.log('🚀 إعداد البيانات الأساسية للإنتاج...');
  
  try {
    // التحقق من وجود البيانات مسبقاً
    const existingCompanies = await pool.query('SELECT COUNT(*) FROM companies');
    if (parseInt(existingCompanies.rows[0].count) > 0) {
      console.log('ℹ️ البيانات موجودة مسبقاً، تخطي الإعداد');
      return;
    }

    console.log('📊 إنشاء الشركات الأساسية...');
    
    // إنشاء الشركات
    const companies = [
      {
        id: 1,
        name_ar: 'الشؤون الإدارية الإدارة العامة',
        name_en: 'Administrative Affairs General Management',
        manager_name: 'مدير الشؤون الإدارية'
      },
      {
        id: 2,
        name_ar: 'شركة الألبان والأغذية الوطنية الحديدة',
        name_en: 'National Dairy & Food Company - Hodeidah',
        manager_name: 'مدير الشؤون الإدارية'
      },
      {
        id: 3,
        name_ar: 'شركة الألبان والأغذية الوطنية - تعز',
        name_en: 'National Dairy & Food Company - Taiz',
        manager_name: 'مدير الشؤون الإدارية'
      }
    ];

    for (const company of companies) {
      await pool.query(
        'INSERT INTO companies (id, name_ar, name_en, manager_name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [company.id, company.name_ar, company.name_en, company.manager_name]
      );
    }

    console.log('👥 إنشاء المستخدمين الأساسيين...');

    // إنشاء المستخدمين الأساسيين
    const users = [
      {
        id: 1,
        username: 'general_manager',
        password: 'general_manager@HSA2025',
        role: 'general_manager',
        company_id: 1,
        full_name: 'مدير عام المجموعة'
      },
      {
        id: 2,
        username: 'admin',
        password: 'admin@HSA2025',
        role: 'admin',
        company_id: 2,
        full_name: 'مدير شركة الحديدة'
      },
      {
        id: 3,
        username: 'admin_taiz',
        password: 'admin_taiz@HSA2025',
        role: 'admin',
        company_id: 3,
        full_name: 'مدير شركة تعز'
      }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      await pool.query(
        'INSERT INTO users (id, username, password_hash, role, company_id, full_name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
        [user.id, user.username, hashedPassword, user.role, user.company_id, user.full_name]
      );
    }

    // إعادة تعيين sequences
    await pool.query("SELECT setval('companies_id_seq', (SELECT MAX(id) FROM companies))");
    await pool.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");

    console.log('✅ تم إعداد البيانات الأساسية بنجاح!');
    console.log('📊 تم إنشاء:');
    console.log('   - 3 شركات');
    console.log('   - 3 مستخدمين أساسيين');
    console.log('');
    console.log('🔐 بيانات الدخول:');
    console.log('   المدير العام: general_manager / general_manager@HSA2025');
    console.log('   مدير الحديدة: admin / admin@HSA2025');
    console.log('   مدير تعز: admin_taiz / admin_taiz@HSA2025');

  } catch (error) {
    console.error('❌ خطأ في إعداد البيانات:', error);
    throw error;
  }
}

// تصدير الدالة للاستخدام في الخادم
export { setupProductionData };