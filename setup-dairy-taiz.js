#!/usr/bin/env node

/**
 * إعداد نظام إدارة النظافة لشركة ألبان تعز
 * Taiz Dairy Cleaning Management System Setup
 * 
 * نظام مستقل بالكامل مع قاعدة بيانات منفصلة
 * Completely independent system with separate database
 * 
 * Developer: Shawqi.jpry
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🥛 بدء إعداد نظام شركة ألبان تعز...');
console.log('🥛 Starting Taiz Dairy System Setup...\n');

// التحقق من وجود مجلد النظام
const taizSystemPath = path.join(__dirname, 'taiz-dairy-system');

if (!fs.existsSync(taizSystemPath)) {
  console.error('❌ مجلد نظام تعز غير موجود!');
  console.error('❌ Taiz system directory not found!');
  process.exit(1);
}

// التحقق من ملف package.json
const packageJsonPath = path.join(taizSystemPath, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ ملف package.json غير موجود في نظام تعز!');
  console.error('❌ package.json not found in Taiz system!');
  process.exit(1);
}

console.log('✅ تم العثور على نظام شركة ألبان تعز');
console.log('✅ Taiz Dairy System found');

// تثبيت التبعيات
console.log('\n📦 تثبيت التبعيات...');
console.log('📦 Installing dependencies...');

const npmInstall = spawn('npm', ['install'], {
  cwd: taizSystemPath,
  stdio: 'inherit'
});

npmInstall.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ فشل في تثبيت التبعيات. رمز الخطأ: ${code}`);
    console.error(`❌ Dependencies installation failed. Exit code: ${code}`);
    process.exit(1);
  }

  console.log('\n✅ تم تثبيت التبعيات بنجاح');
  console.log('✅ Dependencies installed successfully');

  // بدء تشغيل النظام
  console.log('\n🚀 بدء تشغيل نظام شركة ألبان تعز...');
  console.log('🚀 Starting Taiz Dairy System...');
  
  const startSystem = spawn('npm', ['run', 'dev'], {
    cwd: taizSystemPath,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: '5001',
      NODE_ENV: 'development'
    }
  });

  startSystem.on('close', (code) => {
    console.log(`\n🛑 نظام شركة ألبان تعز توقف برمز: ${code}`);
    console.log(`🛑 Taiz Dairy System stopped with code: ${code}`);
  });

  startSystem.on('error', (err) => {
    console.error('❌ خطأ في تشغيل النظام:', err);
    console.error('❌ System startup error:', err);
  });

  // التعامل مع إشارات التوقف
  process.on('SIGTERM', () => {
    console.log('\n🛑 تم استلام إشارة إيقاف...');
    startSystem.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 تم استلام إشارة إيقاف...');
    startSystem.kill('SIGINT');
  });
});

npmInstall.on('error', (err) => {
  console.error('❌ خطأ في تثبيت التبعيات:', err);
  console.error('❌ Dependencies installation error:', err);
  process.exit(1);
});