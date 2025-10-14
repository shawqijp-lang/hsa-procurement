import { neon } from '@neondatabase/serverless';

async function verifyNeonData(connectionString: string) {
  console.log('🔍 التحقق من البيانات في Neon...\n');

  try {
    const sql = neon(connectionString);

    // التحقق من الجداول
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'production'
      ORDER BY table_name;
    `;

    console.log(`✅ عدد الجداول: ${tables.length}`);
    console.log('📋 الجداول:', tables.map(t => t.table_name).join(', '));

    // إحصائيات البيانات
    const companies = await sql`SELECT COUNT(*) as count FROM production.companies;`;
    const users = await sql`SELECT COUNT(*) as count FROM production.users;`;
    const locations = await sql`SELECT COUNT(*) as count FROM production.locations;`;
    const checklists = await sql`SELECT COUNT(*) as count FROM production.checklist_templates;`;
    const dailyChecklists = await sql`SELECT COUNT(*) as count FROM production.daily_checklists;`;

    console.log('\n📊 إحصائيات البيانات:');
    console.log(`   • الشركات: ${companies[0].count}`);
    console.log(`   • المستخدمين: ${users[0].count}`);
    console.log(`   • المواقع: ${locations[0].count}`);
    console.log(`   • قوالب التقييم: ${checklists[0].count}`);
    console.log(`   • التقييمات اليومية: ${dailyChecklists[0].count}`);

    console.log('\n✅ قاعدة البيانات تعمل بشكل صحيح على Neon!');
    console.log('🎉 جاهز للخطوة التالية: نشر التطبيق على Railway');

  } catch (error: any) {
    console.error('❌ خطأ في التحقق:', error.message);
    throw error;
  }
}

const connectionString = process.argv[2];

if (!connectionString) {
  console.error('❌ يرجى تقديم Neon connection string');
  process.exit(1);
}

verifyNeonData(connectionString).catch(console.error);
