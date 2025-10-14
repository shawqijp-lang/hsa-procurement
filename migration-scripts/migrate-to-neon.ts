import { neon } from '@neondatabase/serverless';

// الاتصال بقاعدة بيانات Neon الجديدة
const neonConnectionString = process.argv[2];
if (!neonConnectionString) {
  console.error('❌ الرجاء تمرير Neon connection string كمعامل');
  console.error('مثال: tsx migration-scripts/migrate-to-neon.ts "postgresql://..."');
  process.exit(1);
}

const replitSql = neon(process.env.DATABASE_URL_PROD!);
const neonSql = neon(neonConnectionString);

async function migrateData() {
  console.log('🚀 بدء نقل البيانات من Replit إلى Neon...\n');

  try {
    // 1. إنشاء production schema في Neon
    console.log('📦 إنشاء production schema...');
    await neonSql`CREATE SCHEMA IF NOT EXISTS production`;
    console.log('✅ تم إنشاء production schema\n');

    // 2. إنشاء الجداول
    console.log('🔨 إنشاء الجداول...');
    
    await neonSql`
      CREATE TABLE IF NOT EXISTS production.companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        logo_url VARCHAR,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS production.users (
        id SERIAL PRIMARY KEY,
        username VARCHAR UNIQUE NOT NULL,
        password_hash VARCHAR NOT NULL,
        full_name VARCHAR NOT NULL,
        role VARCHAR NOT NULL,
        company_id INTEGER REFERENCES production.companies(id),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS production.locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        icon VARCHAR,
        company_id INTEGER REFERENCES production.companies(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS production.categories (
        id SERIAL PRIMARY KEY,
        name_ar VARCHAR NOT NULL,
        name_en VARCHAR NOT NULL,
        order_index INTEGER,
        company_id INTEGER REFERENCES production.companies(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS production.checklist_items (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES production.categories(id),
        name_ar VARCHAR[] NOT NULL,
        name_en VARCHAR NOT NULL,
        order_index INTEGER,
        has_sub_tasks BOOLEAN DEFAULT false,
        sub_tasks JSONB,
        company_id INTEGER REFERENCES production.companies(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS production.location_checklists (
        id SERIAL PRIMARY KEY,
        location_id INTEGER REFERENCES production.locations(id),
        checklist_item_id INTEGER REFERENCES production.checklist_items(id),
        company_id INTEGER REFERENCES production.companies(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS production.daily_checklists (
        id SERIAL PRIMARY KEY,
        location_id INTEGER REFERENCES production.locations(id),
        user_id INTEGER REFERENCES production.users(id),
        date DATE NOT NULL,
        status VARCHAR DEFAULT 'pending',
        company_id INTEGER REFERENCES production.companies(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS production.checklist_evaluations (
        id SERIAL PRIMARY KEY,
        daily_checklist_id INTEGER REFERENCES production.daily_checklists(id),
        checklist_item_id INTEGER REFERENCES production.checklist_items(id),
        rating INTEGER,
        sub_task_ratings JSONB,
        notes VARCHAR,
        company_id INTEGER REFERENCES production.companies(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS production.dashboard_sections (
        id SERIAL PRIMARY KEY,
        section_key VARCHAR UNIQUE NOT NULL,
        name_ar VARCHAR NOT NULL,
        name_en VARCHAR NOT NULL,
        order_index INTEGER,
        is_active BOOLEAN DEFAULT true,
        company_id INTEGER REFERENCES production.companies(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS production.user_dashboard_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES production.users(id),
        section_key VARCHAR NOT NULL,
        is_visible BOOLEAN DEFAULT true,
        company_id INTEGER REFERENCES production.companies(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS production.role_permissions (
        id SERIAL PRIMARY KEY,
        role VARCHAR NOT NULL,
        permissions JSONB NOT NULL,
        company_id INTEGER REFERENCES production.companies(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await neonSql`
      CREATE TABLE IF NOT EXISTS production.permission_audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES production.users(id),
        action VARCHAR NOT NULL,
        details JSONB,
        ip_address VARCHAR,
        company_id INTEGER REFERENCES production.companies(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('✅ تم إنشاء جميع الجداول\n');

    // 3. نقل البيانات جدول بجدول
    console.log('📊 نقل البيانات...\n');

    // نقل الشركات
    console.log('  → نقل الشركات...');
    const companies = await replitSql`SELECT * FROM production.companies`;
    if (companies.length > 0) {
      for (const company of companies) {
        await neonSql`
          INSERT INTO production.companies (id, name, logo_url, created_at)
          VALUES (${company.id}, ${company.name}, ${company.logo_url}, ${company.created_at})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      console.log(`  ✅ تم نقل ${companies.length} شركة`);
    }

    // نقل المستخدمين
    console.log('  → نقل المستخدمين...');
    const users = await replitSql`SELECT * FROM production.users`;
    if (users.length > 0) {
      for (const user of users) {
        await neonSql`
          INSERT INTO production.users (id, username, password_hash, full_name, role, company_id, is_active, last_login, created_at, updated_at)
          VALUES (${user.id}, ${user.username}, ${user.password_hash}, ${user.full_name}, ${user.role}, ${user.company_id}, ${user.is_active}, ${user.last_login}, ${user.created_at}, ${user.updated_at})
          ON CONFLICT (username) DO NOTHING
        `;
      }
      console.log(`  ✅ تم نقل ${users.length} مستخدم`);
    }

    // نقل المواقع
    console.log('  → نقل المواقع...');
    const locations = await replitSql`SELECT * FROM production.locations`;
    if (locations.length > 0) {
      for (const location of locations) {
        await neonSql`
          INSERT INTO production.locations (id, name, icon, company_id, is_active, created_at)
          VALUES (${location.id}, ${location.name}, ${location.icon}, ${location.company_id}, ${location.is_active}, ${location.created_at})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      console.log(`  ✅ تم نقل ${locations.length} موقع`);
    }

    // نقل الفئات
    console.log('  → نقل الفئات...');
    const categories = await replitSql`SELECT * FROM production.categories`;
    if (categories.length > 0) {
      for (const category of categories) {
        await neonSql`
          INSERT INTO production.categories (id, name_ar, name_en, order_index, company_id, created_at)
          VALUES (${category.id}, ${category.name_ar}, ${category.name_en}, ${category.order_index}, ${category.company_id}, ${category.created_at})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      console.log(`  ✅ تم نقل ${categories.length} فئة`);
    }

    // نقل عناصر القائمة
    console.log('  → نقل عناصر القائمة...');
    const checklistItems = await replitSql`SELECT * FROM production.checklist_items`;
    if (checklistItems.length > 0) {
      for (const item of checklistItems) {
        await neonSql`
          INSERT INTO production.checklist_items (id, category_id, name_ar, name_en, order_index, has_sub_tasks, sub_tasks, company_id, created_at)
          VALUES (${item.id}, ${item.category_id}, ${item.name_ar}, ${item.name_en}, ${item.order_index}, ${item.has_sub_tasks}, ${item.sub_tasks}, ${item.company_id}, ${item.created_at})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      console.log(`  ✅ تم نقل ${checklistItems.length} عنصر`);
    }

    // نقل قوائم المواقع
    console.log('  → نقل قوائم المواقع...');
    const locationChecklists = await replitSql`SELECT * FROM production.location_checklists`;
    if (locationChecklists.length > 0) {
      for (const lc of locationChecklists) {
        await neonSql`
          INSERT INTO production.location_checklists (id, location_id, checklist_item_id, company_id, created_at)
          VALUES (${lc.id}, ${lc.location_id}, ${lc.checklist_item_id}, ${lc.company_id}, ${lc.created_at})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      console.log(`  ✅ تم نقل ${locationChecklists.length} قائمة موقع`);
    }

    // نقل التقييمات اليومية
    console.log('  → نقل التقييمات اليومية...');
    const dailyChecklists = await replitSql`SELECT * FROM production.daily_checklists`;
    if (dailyChecklists.length > 0) {
      for (const dc of dailyChecklists) {
        await neonSql`
          INSERT INTO production.daily_checklists (id, location_id, user_id, date, status, company_id, created_at, updated_at)
          VALUES (${dc.id}, ${dc.location_id}, ${dc.user_id}, ${dc.date}, ${dc.status}, ${dc.company_id}, ${dc.created_at}, ${dc.updated_at})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      console.log(`  ✅ تم نقل ${dailyChecklists.length} تقييم يومي`);
    }

    // نقل تقييمات العناصر
    console.log('  → نقل تقييمات العناصر...');
    const checklistEvaluations = await replitSql`SELECT * FROM production.checklist_evaluations`;
    if (checklistEvaluations.length > 0) {
      for (const evaluation of checklistEvaluations) {
        await neonSql`
          INSERT INTO production.checklist_evaluations (id, daily_checklist_id, checklist_item_id, rating, sub_task_ratings, notes, company_id, created_at)
          VALUES (${evaluation.id}, ${evaluation.daily_checklist_id}, ${evaluation.checklist_item_id}, ${evaluation.rating}, ${evaluation.sub_task_ratings}, ${evaluation.notes}, ${evaluation.company_id}, ${evaluation.created_at})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      console.log(`  ✅ تم نقل ${checklistEvaluations.length} تقييم`);
    }

    // نقل أقسام اللوحة
    console.log('  → نقل أقسام اللوحة...');
    const dashboardSections = await replitSql`SELECT * FROM production.dashboard_sections`;
    if (dashboardSections.length > 0) {
      for (const section of dashboardSections) {
        await neonSql`
          INSERT INTO production.dashboard_sections (id, section_key, name_ar, name_en, order_index, is_active, company_id, created_at)
          VALUES (${section.id}, ${section.section_key}, ${section.name_ar}, ${section.name_en}, ${section.order_index}, ${section.is_active}, ${section.company_id}, ${section.created_at})
          ON CONFLICT (section_key) DO NOTHING
        `;
      }
      console.log(`  ✅ تم نقل ${dashboardSections.length} قسم لوحة`);
    }

    // نقل أذونات المستخدمين
    console.log('  → نقل أذونات المستخدمين...');
    const userPermissions = await replitSql`SELECT * FROM production.user_dashboard_permissions`;
    if (userPermissions.length > 0) {
      for (const perm of userPermissions) {
        await neonSql`
          INSERT INTO production.user_dashboard_permissions (id, user_id, section_key, is_visible, company_id, created_at)
          VALUES (${perm.id}, ${perm.user_id}, ${perm.section_key}, ${perm.is_visible}, ${perm.company_id}, ${perm.created_at})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      console.log(`  ✅ تم نقل ${userPermissions.length} إذن مستخدم`);
    }

    // نقل أذونات الأدوار
    console.log('  → نقل أذونات الأدوار...');
    const rolePermissions = await replitSql`SELECT * FROM production.role_permissions`;
    if (rolePermissions.length > 0) {
      for (const rolePerm of rolePermissions) {
        await neonSql`
          INSERT INTO production.role_permissions (id, role, permissions, company_id, created_at, updated_at)
          VALUES (${rolePerm.id}, ${rolePerm.role}, ${rolePerm.permissions}, ${rolePerm.company_id}, ${rolePerm.created_at}, ${rolePerm.updated_at})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      console.log(`  ✅ تم نقل ${rolePermissions.length} إذن دور`);
    }

    // نقل سجل التدقيق
    console.log('  → نقل سجل التدقيق...');
    const auditLog = await replitSql`SELECT * FROM production.permission_audit_log`;
    if (auditLog.length > 0) {
      for (const log of auditLog) {
        await neonSql`
          INSERT INTO production.permission_audit_log (id, user_id, action, details, ip_address, company_id, created_at)
          VALUES (${log.id}, ${log.user_id}, ${log.action}, ${log.details}, ${log.ip_address}, ${log.company_id}, ${log.created_at})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      console.log(`  ✅ تم نقل ${auditLog.length} سجل تدقيق`);
    }

    console.log('\n🎉 تم نقل جميع البيانات بنجاح!');
    console.log('✅ قاعدة البيانات جاهزة للاستخدام على Neon\n');

    // عرض ملخص
    console.log('📊 ملخص النقل:');
    console.log(`   - الشركات: ${companies.length}`);
    console.log(`   - المستخدمون: ${users.length}`);
    console.log(`   - المواقع: ${locations.length}`);
    console.log(`   - الفئات: ${categories.length}`);
    console.log(`   - عناصر القائمة: ${checklistItems.length}`);
    console.log(`   - التقييمات اليومية: ${dailyChecklists.length}`);
    console.log(`   - التقييمات: ${checklistEvaluations.length}\n`);

  } catch (error) {
    console.error('❌ خطأ أثناء النقل:', error);
    process.exit(1);
  }
}

migrateData();
