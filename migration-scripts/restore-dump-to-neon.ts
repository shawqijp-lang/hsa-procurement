import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

async function restoreDumpToNeon(targetConnectionString: string) {
  console.log('🚀 بدء استعادة قاعدة البيانات إلى Neon...\n');

  try {
    // التحقق من وجود الملف
    if (!fs.existsSync('production_export.dump')) {
      throw new Error('❌ ملف production_export.dump غير موجود');
    }

    console.log('📦 حجم الملف:', (fs.statSync('production_export.dump').size / 1024).toFixed(2), 'KB');
    console.log('🔗 الاتصال بـ Neon...\n');

    // استخدام pg_restore لاستعادة الملف
    const command = `pg_restore --verbose --clean --no-acl --no-owner -d "${targetConnectionString}" production_export.dump`;
    
    console.log('⚙️ تنفيذ pg_restore...\n');
    
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });

    if (stdout) {
      console.log('📄 النتائج:', stdout.substring(0, 500));
    }

    // stderr في pg_restore يحتوي على معلومات verbose، وليس بالضرورة أخطاء
    if (stderr) {
      const lines = stderr.split('\n');
      const errorLines = lines.filter(line => 
        line.toLowerCase().includes('error') && 
        !line.includes('already exists')
      );
      
      if (errorLines.length > 0) {
        console.warn('\n⚠️ تحذيرات:', errorLines.slice(0, 10).join('\n'));
      } else {
        console.log('✅ العملية تمت بنجاح (verbose output في stderr طبيعي)');
      }
    }

    console.log('\n✅ تم الانتهاء من استعادة البيانات إلى Neon!');
    console.log('🎉 يمكنك الآن استخدام قاعدة البيانات على Neon');

  } catch (error: any) {
    console.error('\n❌ فشلت عملية الاستعادة:', error.message);
    
    if (error.stderr) {
      console.error('\n📋 تفاصيل الخطأ:');
      const errorLines = error.stderr.split('\n').slice(0, 20);
      errorLines.forEach((line: string) => console.error(line));
    }
    
    throw error;
  }
}

// الحصول على connection string من الأرجومينت
const targetConnectionString = process.argv[2];

if (!targetConnectionString) {
  console.error('❌ يرجى تقديم Neon connection string');
  console.error('الاستخدام: tsx restore-dump-to-neon.ts "postgresql://..."');
  process.exit(1);
}

restoreDumpToNeon(targetConnectionString)
  .then(() => {
    console.log('\n✨ انتهت العملية بنجاح!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 فشلت العملية:', error.message);
    process.exit(1);
  });
