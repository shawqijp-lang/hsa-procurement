// 🔄 نظام المزامنة التلقائية من الإنتاج للتطوير
// يعمل فقط في اتجاه واحد: الإنتاج → التطوير

import { pool } from './db.js';

export async function syncProductionToDevelopment() {
  if (process.env.REPLIT_DEV_DOMAIN) {
    console.log('🔄 بدء مزامنة بيانات الإنتاج للتطوير...');
    
    try {
      // قائمة الجداول للمزامنة
      const tables = [
        'companies', 'users', 'locations', 'checklist_templates',
        'dashboard_settings', 'user_location_permissions',
        'supervisor_user_location_permissions', 'supervisor_assessment_location_permissions',
        'user_dashboard_settings', 'kpi_access', 'security_logs', 'login_attempts'
      ];

      for (const table of tables) {
        await pool.query(`
          INSERT INTO development.${table} 
          SELECT * FROM production.${table} 
          ON CONFLICT (id) DO UPDATE SET 
            updated_at = EXCLUDED.updated_at,
            name_ar = COALESCE(EXCLUDED.name_ar, development.${table}.name_ar),
            name_en = COALESCE(EXCLUDED.name_en, development.${table}.name_en)
        `);
      }

      console.log('✅ تمت المزامنة بنجاح');
    } catch (error) {
      console.error('❌ خطأ في المزامنة:', error);
    }
  }
}

// تشغيل المزامنة كل 5 دقائق في بيئة التطوير
if (process.env.REPLIT_DEV_DOMAIN) {
  setInterval(syncProductionToDevelopment, 5 * 60 * 1000);
  console.log('🔄 تم تفعيل المزامنة التلقائية كل 5 دقائق');
}