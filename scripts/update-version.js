#!/usr/bin/env node
/**
 * نص تحديث رقم الإصدار التلقائي
 * يقوم بزيادة رقم الإصدار وتحديث الملفات ذات الصلة
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسارات الملفات المطلوب تحديثها
const FILES_TO_UPDATE = {
  manifest: path.join(__dirname, '../public/manifest.json'),
  versionCheck: path.join(__dirname, '../public/version-check.json'),
  serviceWorker: path.join(__dirname, '../public/sw.js')
};

// قراءة الإصدار الحالي
function getCurrentVersion() {
  try {
    const manifestContent = fs.readFileSync(FILES_TO_UPDATE.manifest, 'utf8');
    const manifest = JSON.parse(manifestContent);
    return manifest.version || '1.0.0';
  } catch (error) {
    console.error('خطأ في قراءة الإصدار الحالي:', error);
    return '1.0.0';
  }
}

// زيادة رقم الإصدار
function incrementVersion(currentVersion, type = 'patch') {
  const parts = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
    default:
      parts[2]++;
      break;
  }
  
  return parts.join('.');
}

// تحديث manifest.json
function updateManifest(newVersion) {
  try {
    const manifestContent = fs.readFileSync(FILES_TO_UPDATE.manifest, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    manifest.version = newVersion;
    
    fs.writeFileSync(FILES_TO_UPDATE.manifest, JSON.stringify(manifest, null, 2));
    console.log(`✅ تم تحديث manifest.json إلى الإصدار ${newVersion}`);
  } catch (error) {
    console.error('خطأ في تحديث manifest.json:', error);
  }
}

// تحديث version-check.json
function updateVersionCheck(newVersion) {
  try {
    const buildNumber = Date.now();
    const versionData = {
      version: newVersion,
      buildNumber: buildNumber,
      releaseDate: new Date().toISOString().split('T')[0],
      description: `إصدار ${newVersion} - تحسينات وإصلاحات`,
      features: [
        "تحسينات الأداء",
        "إصلاحات الأخطاء",
        "تحسين تجربة المستخدم"
      ]
    };
    
    fs.writeFileSync(FILES_TO_UPDATE.versionCheck, JSON.stringify(versionData, null, 2));
    console.log(`✅ تم تحديث version-check.json إلى الإصدار ${newVersion}`);
  } catch (error) {
    console.error('خطأ في تحديث version-check.json:', error);
  }
}

// تحديث Service Worker
function updateServiceWorker(newVersion) {
  try {
    let swContent = fs.readFileSync(FILES_TO_UPDATE.serviceWorker, 'utf8');
    const buildNumber = Date.now();
    
    // تحديث الإصدار ورقم البناء
    swContent = swContent.replace(
      /const VERSION = '[^']*';/,
      `const VERSION = '${newVersion}';`
    );
    
    swContent = swContent.replace(
      /const BUILD_NUMBER = [^;]*;/,
      `const BUILD_NUMBER = ${buildNumber}; // رقم البناء الفريد`
    );
    
    fs.writeFileSync(FILES_TO_UPDATE.serviceWorker, swContent);
    console.log(`✅ تم تحديث Service Worker إلى الإصدار ${newVersion}`);
  } catch (error) {
    console.error('خطأ في تحديث Service Worker:', error);
  }
}

// الدالة الرئيسية
function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch';
  
  console.log('🚀 بدء عملية تحديث الإصدار...\n');
  
  const currentVersion = getCurrentVersion();
  console.log(`📊 الإصدار الحالي: ${currentVersion}`);
  
  const newVersion = incrementVersion(currentVersion, versionType);
  console.log(`🆕 الإصدار الجديد: ${newVersion}\n`);
  
  // تحديث جميع الملفات
  updateManifest(newVersion);
  updateVersionCheck(newVersion);
  updateServiceWorker(newVersion);
  
  console.log(`\n🎉 تم تحديث الإصدار بنجاح من ${currentVersion} إلى ${newVersion}`);
  console.log(`\n📝 استخدام:`);
  console.log(`   npm run version:patch   - زيادة رقم الإصلاح (${currentVersion} → ${incrementVersion(currentVersion, 'patch')})`);
  console.log(`   npm run version:minor   - زيادة رقم الميزة (${currentVersion} → ${incrementVersion(currentVersion, 'minor')})`);
  console.log(`   npm run version:major   - زيادة رقم الإصدار الرئيسي (${currentVersion} → ${incrementVersion(currentVersion, 'major')})`);
}

// تشغيل البرنامج
main();