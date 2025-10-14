#!/usr/bin/env node

/**
 * تحليل الملفات الحالية في التطبيق
 * لتحديد الملفات المستخدمة وغير المستخدمة
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FileAnalyzer {
  constructor() {
    this.results = {
      documentationFiles: [],
      temporaryFiles: [],
      oldScripts: [],
      unusedAssets: [],
      codeFiles: {
        pages: [],
        components: [],
        serverFiles: [],
        utilities: []
      },
      analysis: {
        totalFiles: 0,
        filesToKeep: 0,
        filesToRemove: 0,
        spaceToSave: 0
      }
    };
  }

  async analyzeProject() {
    console.log('🔍 بدء تحليل ملفات المشروع...');
    
    // تحليل الملفات في المجلد الجذر
    await this.analyzeRootDirectory();
    
    // تحليل ملفات العميل
    await this.analyzeClientFiles();
    
    // تحليل ملفات الخادم
    await this.analyzeServerFiles();
    
    // تحليل الأصول المرفقة
    await this.analyzeAttachedAssets();
    
    // إنتاج التقرير
    await this.generateAnalysisReport();
    
    return this.results;
  }

  async analyzeRootDirectory() {
    console.log('📁 تحليل المجلد الجذر...');
    
    try {
      const rootFiles = await fs.readdir('.');
      
      for (const file of rootFiles) {
        const stats = await fs.stat(file);
        
        if (stats.isFile()) {
          await this.categorizeRootFile(file, stats);
        }
      }
    } catch (error) {
      console.error('خطأ في تحليل المجلد الجذر:', error);
    }
  }

  async categorizeRootFile(fileName, stats) {
    const fileSize = stats.size;
    this.results.analysis.totalFiles++;

    // ملفات التوثيق
    if (fileName.endsWith('.md') && !this.isEssentialDoc(fileName)) {
      this.results.documentationFiles.push({
        name: fileName,
        size: fileSize,
        reason: 'ملف توثيق قديم'
      });
      this.results.analysis.filesToRemove++;
      this.results.analysis.spaceToSave += fileSize;
    }
    
    // ملفات مؤقتة
    else if (fileName.endsWith('.txt') || fileName.endsWith('.json') && this.isTemporaryFile(fileName)) {
      this.results.temporaryFiles.push({
        name: fileName,
        size: fileSize,
        reason: 'ملف مؤقت'
      });
      this.results.analysis.filesToRemove++;
      this.results.analysis.spaceToSave += fileSize;
    }
    
    // سكريبتات قديمة
    else if (fileName.endsWith('.js') && this.isOldScript(fileName)) {
      this.results.oldScripts.push({
        name: fileName,
        size: fileSize,
        reason: 'سكريبت قديم'
      });
      this.results.analysis.filesToRemove++;
      this.results.analysis.spaceToSave += fileSize;
    }
    
    // ملفات مهمة
    else {
      this.results.analysis.filesToKeep++;
    }
  }

  isEssentialDoc(fileName) {
    const essentialDocs = [
      'README.md',
      'replit.md',
      'DEPLOYMENT_GUIDE.md',
      'INSTALL_GUIDE.md'
    ];
    return essentialDocs.includes(fileName);
  }

  isTemporaryFile(fileName) {
    const tempPatterns = [
      'temp_',
      'backup_',
      'test_',
      '_temp',
      'debug_',
      'log_',
      'token',
      'credentials',
      'login_',
      'user_',
      'admin_',
      'cleanup'
    ];
    
    return tempPatterns.some(pattern => fileName.toLowerCase().includes(pattern));
  }

  isOldScript(fileName) {
    const oldScriptPatterns = [
      'backup-',
      'fix-',
      'create-',
      'admin-',
      'force_',
      'quick-',
      'export-',
      'deep-',
      'enhanced-',
      'comprehensive-'
    ];
    
    return oldScriptPatterns.some(pattern => fileName.toLowerCase().includes(pattern));
  }

  async analyzeClientFiles() {
    console.log('🖥️ تحليل ملفات العميل...');
    
    try {
      // تحليل الصفحات
      await this.analyzePages();
      
      // تحليل المكونات
      await this.analyzeComponents();
      
    } catch (error) {
      console.error('خطأ في تحليل ملفات العميل:', error);
    }
  }

  async analyzePages() {
    const pagesPath = './client/src/pages';
    try {
      const pages = await fs.readdir(pagesPath);
      
      for (const page of pages) {
        if (page.endsWith('.tsx')) {
          const isUsed = await this.isPageUsed(page);
          const stats = await fs.stat(path.join(pagesPath, page));
          
          this.results.codeFiles.pages.push({
            name: page,
            used: isUsed,
            size: stats.size,
            path: path.join(pagesPath, page)
          });
          
          if (!isUsed) {
            this.results.analysis.filesToRemove++;
            this.results.analysis.spaceToSave += stats.size;
          } else {
            this.results.analysis.filesToKeep++;
          }
        }
      }
    } catch (error) {
      console.log('⚠️ لم يتم العثور على مجلد الصفحات');
    }
  }

  async isPageUsed(pageName) {
    try {
      const appFile = await fs.readFile('./client/src/App.tsx', 'utf8');
      const componentName = pageName.replace('.tsx', '');
      
      // البحث عن استخدام الصفحة في ملف App.tsx
      const patterns = [
        new RegExp(`import.*${componentName}`, 'i'),
        new RegExp(`<Route.*component={${componentName}}`, 'i'),
        new RegExp(`<${componentName}`, 'i')
      ];
      
      return patterns.some(pattern => pattern.test(appFile));
    } catch (error) {
      return false;
    }
  }

  async analyzeComponents() {
    // تحليل المكونات سيتم هنا
    console.log('🧩 تحليل المكونات...');
  }

  async analyzeServerFiles() {
    console.log('🖥️ تحليل ملفات الخادم...');
    // تحليل ملفات الخادم
  }

  async analyzeAttachedAssets() {
    console.log('📎 تحليل الأصول المرفقة...');
    
    try {
      const assetsPath = './attached_assets';
      const assets = await fs.readdir(assetsPath);
      
      let totalSize = 0;
      let oldAssets = 0;
      
      for (const asset of assets) {
        const stats = await fs.stat(path.join(assetsPath, asset));
        totalSize += stats.size;
        
        // تحديد الأصول القديمة (أقدم من 3 أشهر ولا تستخدم)
        const isOld = this.isOldAsset(asset, stats);
        if (isOld) {
          this.results.unusedAssets.push({
            name: asset,
            size: stats.size,
            lastModified: stats.mtime,
            reason: 'أصل قديم غير مستخدم'
          });
          oldAssets++;
          this.results.analysis.filesToRemove++;
          this.results.analysis.spaceToSave += stats.size;
        }
      }
      
      console.log(`📊 إجمالي الأصول: ${assets.length}`);
      console.log(`📊 الأصول القديمة: ${oldAssets}`);
      console.log(`📊 حجم الأصول الإجمالي: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
      
    } catch (error) {
      console.log('⚠️ لم يتم العثور على مجلد الأصول');
    }
  }

  isOldAsset(fileName, stats) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    // إذا كان الملف أقدم من 3 أشهر
    return stats.mtime < threeMonthsAgo;
  }

  async generateAnalysisReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFilesAnalyzed: this.results.analysis.totalFiles,
        filesToKeep: this.results.analysis.filesToKeep,
        filesToRemove: this.results.analysis.filesToRemove,
        spaceToBeSaved: `${(this.results.analysis.spaceToSave / (1024 * 1024)).toFixed(2)} MB`,
        cleanupRecommendation: this.getCleanupRecommendation()
      },
      categories: {
        documentationFiles: {
          count: this.results.documentationFiles.length,
          files: this.results.documentationFiles
        },
        temporaryFiles: {
          count: this.results.temporaryFiles.length,
          files: this.results.temporaryFiles
        },
        oldScripts: {
          count: this.results.oldScripts.length,
          files: this.results.oldScripts
        },
        unusedAssets: {
          count: this.results.unusedAssets.length,
          files: this.results.unusedAssets
        },
        codeFiles: this.results.codeFiles
      },
      recommendations: this.generateRecommendations()
    };

    const reportFileName = `file-analysis-report-${new Date().toISOString().split('T')[0]}.json`;
    await fs.writeFile(reportFileName, JSON.stringify(report, null, 2));
    
    console.log('\n📋 تقرير التحليل:');
    console.log('=' .repeat(50));
    console.log(`📊 إجمالي الملفات المحللة: ${report.summary.totalFilesAnalyzed}`);
    console.log(`✅ ملفات مهمة (ستبقى): ${report.summary.filesToKeep}`);
    console.log(`🗑️ ملفات مرشحة للحذف: ${report.summary.filesToRemove}`);
    console.log(`💾 مساحة يمكن توفيرها: ${report.summary.spaceToBeSaved}`);
    console.log(`📄 ملفات توثيق قديمة: ${report.categories.documentationFiles.count}`);
    console.log(`🗂️ ملفات مؤقتة: ${report.categories.temporaryFiles.count}`);
    console.log(`📜 سكريپتات قديمة: ${report.categories.oldScripts.count}`);
    console.log(`📎 أصول غير مستخدمة: ${report.categories.unusedAssets.count}`);
    console.log('=' .repeat(50));
    console.log(`📋 تم حفظ التقرير في: ${reportFileName}`);
    
    return report;
  }

  getCleanupRecommendation() {
    const filesToRemove = this.results.analysis.filesToRemove;
    const spaceInMB = this.results.analysis.spaceToSave / (1024 * 1024);
    
    if (filesToRemove > 50 && spaceInMB > 100) {
      return 'ينصح بشدة بإجراء التنظيف - ستوفر مساحة كبيرة';
    } else if (filesToRemove > 20 && spaceInMB > 50) {
      return 'ينصح بإجراء التنظيف - ستحسن الأداء';
    } else if (filesToRemove > 10) {
      return 'يمكن إجراء تنظيف خفيف';
    } else {
      return 'النظام نظيف نسبياً';
    }
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.documentationFiles.length > 10) {
      recommendations.push('أرشفة الملفات التوثيقية القديمة');
    }
    
    if (this.results.temporaryFiles.length > 5) {
      recommendations.push('حذف الملفات المؤقتة وملفات الاختبار');
    }
    
    if (this.results.oldScripts.length > 3) {
      recommendations.push('إزالة السكريپتات القديمة غير المستخدمة');
    }
    
    if (this.results.unusedAssets.length > 10) {
      recommendations.push('تنظيف مجلد الأصول المرفقة');
    }
    
    recommendations.push('إنشاء نظام تنظيف دوري كل 3 أشهر');
    
    return recommendations;
  }

  async run() {
    console.log('🚀 بدء تحليل ملفات المشروع...');
    console.log('=' .repeat(60));
    
    try {
      const report = await this.analyzeProject();
      console.log('\n✅ اكتمل تحليل الملفات بنجاح!');
      return report;
    } catch (error) {
      console.error('\n❌ خطأ في تحليل الملفات:', error);
      throw error;
    }
  }
}

// تشغيل التحليل
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new FileAnalyzer();
  analyzer.run()
    .then(report => {
      console.log('\n🎉 اكتمل التحليل!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 فشل التحليل:', error);
      process.exit(1);
    });
}

export default FileAnalyzer;