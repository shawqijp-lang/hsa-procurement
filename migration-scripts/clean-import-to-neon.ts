import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';

async function cleanImportToNeon(connectionString: string) {
  console.log('🚀 بدء استيراد نظيف إلى Neon...\n');

  try {
    const sql = neon(connectionString);

    console.log('📦 قراءة ملف SQL...');
    const sqlContent = fs.readFileSync('production_export.sql', 'utf-8');
    
    console.log(`✅ حجم الملف: ${(sqlContent.length / 1024).toFixed(2)} KB`);
    console.log('🔧 معالجة محتوى SQL...\n');

    // تنظيف المحتوى
    const lines = sqlContent.split('\n');
    let cleanedSQL = '';
    let inCopyBlock = false;
    let copyColumns: string[] = [];
    let copyTable = '';
    let copyData: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // بداية COPY block
      if (line.startsWith('COPY ')) {
        inCopyBlock = true;
        const match = line.match(/COPY (\S+)\s*\((.*?)\)/);
        if (match) {
          copyTable = match[1];
          copyColumns = match[2].split(',').map(c => c.trim());
          copyData = [];
        }
        continue;
      }

      // نهاية COPY block
      if (line === '\\.' || line === '\\.') {
        if (inCopyBlock && copyData.length > 0) {
          // تحويل COPY إلى INSERT statements
          console.log(`   📝 معالجة ${copyData.length} سجل من ${copyTable}`);
          
          for (const dataLine of copyData) {
            const values = dataLine.split('\t');
            const formattedValues = values.map(v => {
              if (v === '\\N' || v === 'NULL') return 'NULL';
              if (v === 't') return 'true';
              if (v === 'f') return 'false';
              // escape single quotes
              return `'${v.replace(/'/g, "''")}'`;
            }).join(', ');
            
            cleanedSQL += `INSERT INTO ${copyTable} (${copyColumns.join(', ')}) VALUES (${formattedValues});\n`;
          }
        }
        inCopyBlock = false;
        copyData = [];
        continue;
      }

      // داخل COPY block
      if (inCopyBlock) {
        if (line && line !== '') {
          copyData.push(line);
        }
        continue;
      }

      // سطور SQL عادية
      if (line && !line.startsWith('--')) {
        cleanedSQL += line + '\n';
      }
    }

    console.log('\n⚙️ تنفيذ SQL...\n');
    
    // تقسيم إلى statements منفصلة
    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 عدد الأوامر: ${statements.length}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      try {
        await sql(stmt);
        successCount++;
        
        if ((i + 1) % 100 === 0) {
          console.log(`   ✅ تم تنفيذ ${i + 1}/${statements.length} أمر`);
        }
      } catch (error: any) {
        // تجاهل أخطاء "already exists"
        if (!error.message.includes('already exists')) {
          errorCount++;
          if (errorCount <= 10) {
            console.warn(`   ⚠️ خطأ في السطر ${i + 1}: ${error.message.substring(0, 100)}`);
          }
        }
      }
    }

    console.log(`\n✅ اكتمل: ${successCount} نجح, ${errorCount} خطأ`);
    console.log('🎉 تم الانتهاء من الاستيراد!');

  } catch (error: any) {
    console.error('\n❌ فشلت العملية:', error.message);
    throw error;
  }
}

const connectionString = process.argv[2];

if (!connectionString) {
  console.error('❌ يرجى تقديم Neon connection string');
  process.exit(1);
}

cleanImportToNeon(connectionString)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 خطأ:', error.message);
    process.exit(1);
  });
