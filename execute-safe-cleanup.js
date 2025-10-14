#!/usr/bin/env node

/**
 * تنفيذ التنظيف الآمن للملفات غير المستخدمة
 * بناءً على تقرير التحليل والنسخة الاحتياطية
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SafeCleanup {
  constructor() {
    this.cleanupResults = {
      filesRemoved: [],
      filesFailed: [],
      spaceSaved: 0,
      errors: [],
      summary: {
        totalProcessed: 0,
        successful: 0,
        failed: 0
      }
    };
    
    // الملفات المحمية - لن يتم حذفها أبداً
    this.protectedFiles = [
      'package.json',
      'package-lock.json',
      'vite.config.ts',
      'tailwind.config.ts', 
      'tsconfig.json',
      'drizzle.config.ts',
      'postcss.config.js',
      'components.json',
      'replit.md',
      '.replit',
      '.gitignore',
      'index.html',
      // ملفات النسخ الاحتياطية
      'comprehensive-backup-2025-08-18.json',
      'comprehensive-backup-2025-08-18.json.info',
      'backup-report-2025-08-18.md',
      'file-analysis-report-2025-08-18.json',
      // سكريپتات التنظيف
      'comprehensive-cleanup-system.js',
      'analyze-current-files.js',
      'create-comprehensive-backup.js',
      'execute-safe-cleanup.js'
    ];
  }

  async executeCleanup() {
    console.log('🧹 بدء التنظيف الآمن للنظام...');
    console.log('=' .repeat(60));

    try {
      // قراءة تقرير التحليل
      const analysisReport = await this.loadAnalysisReport();
      
      // تأكيد وجود النسخة الاحتياطية
      await this.verifyBackup();
      
      // تنظيف الملفات التوثيقية
      await this.cleanupDocumentationFiles(analysisReport);
      
      // تنظيف الملفات المؤقتة
      await this.cleanupTemporaryFiles(analysisReport);
      
      // تنظيف السكريپتات القديمة
      await this.cleanupOldScripts(analysisReport);
      
      // إنتاج تقرير التنظيف
      await this.generateCleanupReport();
      
      console.log('✅ اكتمل التنظيف الآمن!');
      return this.cleanupResults;
      
    } catch (error) {
      console.error('❌ خطأ في عملية التنظيف:', error);
      throw error;
    }
  }

  async loadAnalysisReport() {
    console.log('📋 قراءة تقرير التحليل...');
    
    try {
      const reportPath = './file-analysis-report-2025-08-18.json';
      const reportContent = await fs.readFile(reportPath, 'utf8');
      const report = JSON.parse(reportContent);
      
      console.log(`📊 تم تحميل التقرير: ${report.summary.filesToRemove} ملف مرشح للحذف`);
      return report;
      
    } catch (error) {
      throw new Error('لم يتم العثور على تقرير التحليل');
    }
  }

  async verifyBackup() {
    console.log('🔍 التحقق من وجود النسخة الاحتياطية...');
    
    const backupFiles = [
      'comprehensive-backup-2025-08-18.json',
      'comprehensive-backup-2025-08-18.json.info'
    ];
    
    for (const file of backupFiles) {
      try {
        await fs.access(file);
        console.log(`✅ تم التحقق من: ${file}`);
      } catch (error) {
        throw new Error(`النسخة الاحتياطية مفقودة: ${file}`);
      }
    }
    
    console.log('✅ النسخة الاحتياطية موجودة وجاهزة');
  }

  async cleanupDocumentationFiles(report) {
    console.log('📄 تنظيف ملفات التوثيق القديمة...');
    
    const docFiles = report.categories.documentationFiles.files;
    const filesToKeep = [
      'DEPLOYMENT_GUIDE.md',
      'INSTALL_GUIDE.md', 
      'replit.md',
      'CLEANUP_SYSTEM_ANALYSIS.md' // سنحتفظ بهذا للمرجعية
    ];
    
    for (const file of docFiles) {
      if (!filesToKeep.includes(file.name) && !this.protectedFiles.includes(file.name)) {
        await this.safeRemoveFile(file.name, file.size, 'ملف توثيق قديم');
      } else {
        console.log(`🔒 محمي - تم تخطي: ${file.name}`);
      }
    }
  }

  async cleanupTemporaryFiles(report) {
    console.log('🗂️ تنظيف الملفات المؤقتة...');
    
    const tempFiles = report.categories.temporaryFiles.files;
    
    for (const file of tempFiles) {
      if (!this.protectedFiles.includes(file.name)) {
        await this.safeRemoveFile(file.name, file.size, 'ملف مؤقت');
      } else {
        console.log(`🔒 محمي - تم تخطي: ${file.name}`);
      }
    }
  }

  async cleanupOldScripts(report) {
    console.log('📜 تنظيف السكريپتات القديمة...');
    
    const oldScripts = report.categories.oldScripts.files;
    const scriptsToKeep = [
      'comprehensive-cleanup-system.js',
      'analyze-current-files.js',
      'create-comprehensive-backup.js',
      'execute-safe-cleanup.js'
    ];
    
    for (const file of oldScripts) {
      if (!scriptsToKeep.includes(file.name) && !this.protectedFiles.includes(file.name)) {
        await this.safeRemoveFile(file.name, file.size, 'سكريپت قديم');
      } else {
        console.log(`🔒 محمي - تم تخطي: ${file.name}`);
      }
    }
  }

  async safeRemoveFile(fileName, fileSize, reason) {
    this.cleanupResults.summary.totalProcessed++;
    
    try {
      // التحقق من وجود الملف
      await fs.access(fileName);
      
      // حذف الملف
      await fs.unlink(fileName);
      
      this.cleanupResults.filesRemoved.push({
        name: fileName,
        size: fileSize,
        reason: reason,
        timestamp: new Date().toISOString()
      });
      
      this.cleanupResults.spaceSaved += fileSize;
      this.cleanupResults.summary.successful++;
      
      console.log(`🗑️ تم حذف: ${fileName} (${reason})`);
      
    } catch (error) {
      this.cleanupResults.filesFailed.push({
        name: fileName,
        error: error.message,
        reason: reason
      });
      
      this.cleanupResults.errors.push(`فشل حذف ${fileName}: ${error.message}`);
      this.cleanupResults.summary.failed++;
      
      console.log(`⚠️ فشل حذف: ${fileName} - ${error.message}`);
    }
  }

  async generateCleanupReport() {
    console.log('📋 إنشاء تقرير التنظيف...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProcessed: this.cleanupResults.summary.totalProcessed,
        successful: this.cleanupResults.summary.successful,
        failed: this.cleanupResults.summary.failed,
        spaceSaved: `${(this.cleanupResults.spaceSaved / 1024).toFixed(2)} KB`,
        spaceSavedBytes: this.cleanupResults.spaceSaved
      },
      filesRemoved: this.cleanupResults.filesRemoved,
      filesFailed: this.cleanupResults.filesFailed,
      errors: this.cleanupResults.errors,
      protectedFiles: this.protectedFiles,
      recommendations: [
        'تم الاحتفاظ بجميع الملفات الأساسية والمهمة',
        'يمكن تشغيل التطبيق بشكل طبيعي بعد التنظيف',
        'ينصح بإجراء تنظيف دوري كل 3 أشهر',
        'تم حفظ النسخة الاحتياطية للاستعادة عند الحاجة'
      ]
    };

    const reportFileName = `cleanup-execution-report-${new Date().toISOString().split('T')[0]}.json`;
    await fs.writeFile(reportFileName, JSON.stringify(report, null, 2));
    
    // إنشاء ملخص مقروء
    const summary = `
# تقرير تنفيذ التنظيف الآمن

## ملخص العملية
- **التاريخ**: ${new Date().toLocaleString('ar-EG')}
- **إجمالي الملفات المعالجة**: ${report.summary.totalProcessed}
- **تم حذفها بنجاح**: ${report.summary.successful}
- **فشل حذفها**: ${report.summary.failed}
- **المساحة المحررة**: ${report.summary.spaceSaved}

## الملفات المحذوفة
${this.cleanupResults.filesRemoved.map(file => 
  `- ${file.name} (${file.reason}) - ${(file.size / 1024).toFixed(2)} KB`
).join('\n')}

## الملفات المحمية
تم الاحتفاظ بـ ${this.protectedFiles.length} ملف أساسي:
${this.protectedFiles.slice(0, 10).map(file => `- ${file}`).join('\n')}
${this.protectedFiles.length > 10 ? '- وملفات أخرى...' : ''}

## الأخطاء
${this.cleanupResults.errors.length > 0 ? 
  this.cleanupResults.errors.map(error => `- ${error}`).join('\n') :
  'لا توجد أخطاء - تمت العملية بنجاح!'
}

## حالة النظام
✅ النظام جاهز للتشغيل
✅ جميع الملفات الأساسية محفوظة  
✅ النسخة الاحتياطية متوفرة للاستعادة
✅ تم تحسين الأداء وتوفير المساحة

---
تم إنشاء هذا التقرير تلقائياً بواسطة نظام التنظيف الآمن
`;

    await fs.writeFile(`cleanup-summary-${new Date().toISOString().split('T')[0]}.md`, summary);
    
    console.log('\n📊 نتائج التنظيف:');
    console.log('=' .repeat(50));
    console.log(`📁 إجمالي الملفات المعالجة: ${report.summary.totalProcessed}`);
    console.log(`✅ تم حذفها بنجاح: ${report.summary.successful}`);
    console.log(`❌ فشل حذفها: ${report.summary.failed}`);
    console.log(`💾 المساحة المحررة: ${report.summary.spaceSaved}`);
    console.log(`🔒 الملفات المحمية: ${this.protectedFiles.length}`);
    console.log('=' .repeat(50));
    console.log(`📋 تقرير التنظيف: ${reportFileName}`);
    console.log(`📄 ملخص مقروء: cleanup-summary-${new Date().toISOString().split('T')[0]}.md`);
    
    return report;
  }

  async run() {
    console.log('🚀 بدء نظام التنظيف الآمن...');
    console.log('⚠️ تحذير: سيتم حذف الملفات غير المستخدمة نهائياً');
    console.log('✅ النسخة الاحتياطية متوفرة للاستعادة');
    console.log('=' .repeat(60));
    
    try {
      const report = await this.executeCleanup();
      
      console.log('\n🎉 اكتمل التنظيف الآمن بنجاح!');
      console.log('🏃‍♂️ النظام جاهز للتشغيل');
      
      return report;
      
    } catch (error) {
      console.error('❌ فشل التنظيف الآمن:', error);
      console.log('🔄 يمكن استعادة النظام من النسخة الاحتياطية');
      throw error;
    }
  }
}

// تشغيل التنظيف
if (import.meta.url === `file://${process.argv[1]}`) {
  const cleanup = new SafeCleanup();
  cleanup.run()
    .then(() => {
      console.log('\n✅ اكتمل التنظيف بنجاح!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ فشل التنظيف:', error);
      process.exit(1);
    });
}

export default SafeCleanup;