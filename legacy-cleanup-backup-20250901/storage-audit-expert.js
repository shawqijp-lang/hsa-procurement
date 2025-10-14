#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 مراجعة خبير شاملة لأنظمة التخزين المحلي');
console.log('============================================');

async function auditStorageSystems() {
  const files = [];
  const conflicts = [];
  const patterns = {
    oldTokenGet: /localStorage\.getItem\(['"]token['"]\)(?!\s*\|\|)/g,
    oldUserGet: /localStorage\.getItem\(['"]user['"]\)(?!\s*\|\|)/g,
    oldTokenSet: /localStorage\.setItem\(['"]token['"],/g,
    oldUserSet: /localStorage\.setItem\(['"]user['"],/g,
    newTokenGet: /localStorage\.getItem\(['"]auth_token['"]\)/g,
    newUserGet: /localStorage\.getItem\(['"]user_data['"]\)/g,
    unifiedTokenGet: /localStorage\.getItem\(['"]auth_token['"]\)\s*\|\|\s*localStorage\.getItem\(['"]token['"]\)/g,
    unifiedUserGet: /localStorage\.getItem\(['"]user_data['"]\)\s*\|\|\s*localStorage\.getItem\(['"]user['"]\)/g
  };

  function findFiles(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        findFiles(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }
  
  findFiles(path.join(__dirname, 'client', 'src'));
  
  console.log(`📁 فحص ${files.length} ملف...`);
  
  let stats = {
    oldPatterns: 0,
    newPatterns: 0,
    unifiedPatterns: 0,
    conflictedFiles: 0,
    cleanFiles: 0
  };

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(__dirname, filePath);
      let fileHasIssue = false;
      let fileDetails = { path: relativePath, issues: [] };
      
      // فحص الأنماط القديمة
      if (patterns.oldTokenGet.test(content)) {
        stats.oldPatterns++;
        fileHasIssue = true;
        fileDetails.issues.push('استخدام token قديم');
      }
      
      if (patterns.oldUserGet.test(content)) {
        stats.oldPatterns++;
        fileHasIssue = true;
        fileDetails.issues.push('استخدام user قديم');
      }
      
      if (patterns.oldTokenSet.test(content)) {
        stats.oldPatterns++;
        fileHasIssue = true;
        fileDetails.issues.push('حفظ token قديم');
      }
      
      if (patterns.oldUserSet.test(content)) {
        stats.oldPatterns++;
        fileHasIssue = true;
        fileDetails.issues.push('حفظ user قديم');
      }
      
      // فحص الأنماط الموحدة
      if (patterns.unifiedTokenGet.test(content)) {
        stats.unifiedPatterns++;
      }
      
      if (patterns.unifiedUserGet.test(content)) {
        stats.unifiedPatterns++;
      }
      
      if (fileHasIssue) {
        stats.conflictedFiles++;
        conflicts.push(fileDetails);
      } else {
        stats.cleanFiles++;
      }
      
    } catch (error) {
      console.error(`❌ خطأ في فحص ${filePath}:`, error.message);
    }
  }
  
  // تقرير مفصل
  console.log('\n📊 تقرير مفصل:');
  console.log(`  📁 إجمالي الملفات: ${files.length}`);
  console.log(`  ✅ ملفات نظيفة: ${stats.cleanFiles}`);
  console.log(`  ⚠️  ملفات متضاربة: ${stats.conflictedFiles}`);
  console.log(`  🔴 أنماط قديمة: ${stats.oldPatterns}`);
  console.log(`  🟢 أنماط موحدة: ${stats.unifiedPatterns}`);
  
  if (conflicts.length > 0) {
    console.log('\n🔍 تفاصيل الملفات المتضاربة:');
    conflicts.slice(0, 10).forEach(conflict => {
      console.log(`  📄 ${conflict.path}:`);
      conflict.issues.forEach(issue => {
        console.log(`    - ${issue}`);
      });
    });
    
    if (conflicts.length > 10) {
      console.log(`  ... و ${conflicts.length - 10} ملف إضافي`);
    }
  }
  
  // نسبة الإنجاز
  const completionRate = Math.round((stats.cleanFiles / files.length) * 100);
  console.log(`\n📈 نسبة الإنجاز: ${completionRate}%`);
  
  if (completionRate === 100) {
    console.log('🎉 جميع أنظمة التخزين موحدة ونظيفة!');
  } else if (completionRate >= 80) {
    console.log('✅ معظم أنظمة التخزين موحدة - تحتاج لمسات أخيرة');
  } else {
    console.log('⚠️ تحتاج إلى مزيد من التوحيد');
  }
  
  return {
    stats,
    conflicts,
    completionRate
  };
}

auditStorageSystems().catch(console.error);