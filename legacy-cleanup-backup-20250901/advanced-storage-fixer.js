#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎯 إصلاح متقدم ونهائي لأنظمة التخزين المحلي');
console.log('=========================================');

async function advancedStorageFix() {
  const files = [];
  const fixedFiles = [];
  
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
  
  console.log(`📁 معالجة ${files.length} ملف...`);
  
  for (const filePath of files) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;
      const relativePath = path.relative(__dirname, filePath);
      
      // 1. إصلاح token patterns
      const oldTokenPattern = /localStorage\.getItem\(['"]token['"]\)(?!\s*\|\|)/g;
      if (oldTokenPattern.test(content)) {
        content = content.replace(oldTokenPattern, "localStorage.getItem('auth_token') || localStorage.getItem('token')");
        changed = true;
      }
      
      // 2. إصلاح user patterns  
      const oldUserPattern = /localStorage\.getItem\(['"]user['"]\)(?!\s*\|\|)/g;
      if (oldUserPattern.test(content)) {
        content = content.replace(oldUserPattern, "localStorage.getItem('user_data') || localStorage.getItem('user')");
        changed = true;
      }
      
      // 3. إصلاح setItem patterns
      if (content.includes("localStorage.setItem('token'")) {
        content = content.replace(/localStorage\.setItem\(['"]token['"], /g, "localStorage.setItem('auth_token', ");
        changed = true;
      }
      
      if (content.includes("localStorage.setItem('user'")) {
        content = content.replace(/localStorage\.setItem\(['"]user['"], /g, "localStorage.setItem('user_data', ");
        changed = true;
      }
      
      // 4. إزالة التكرار الزائد
      const duplicateTokenPattern = /localStorage\.getItem\(['"]auth_token['"]\)\s*\|\|\s*localStorage\.getItem\(['"]auth_token['"]\)\s*\|\|\s*localStorage\.getItem\(['"]token['"]\)/g;
      if (duplicateTokenPattern.test(content)) {
        content = content.replace(duplicateTokenPattern, "localStorage.getItem('auth_token') || localStorage.getItem('token')");
        changed = true;
      }
      
      const duplicateUserPattern = /localStorage\.getItem\(['"]user_data['"]\)\s*\|\|\s*localStorage\.getItem\(['"]user_data['"]\)\s*\|\|\s*localStorage\.getItem\(['"]user['"]\)/g;
      if (duplicateUserPattern.test(content)) {
        content = content.replace(duplicateUserPattern, "localStorage.getItem('user_data') || localStorage.getItem('user')");
        changed = true;
      }
      
      // 5. إزالة التكرار المضاعف
      const tripleTokenPattern = /localStorage\.getItem\(['"]auth_token['"]\)\s*\|\|\s*localStorage\.getItem\(['"]auth_token['"]\)\s*\|\|\s*localStorage\.getItem\(['"]auth_token['"]\)\s*\|\|\s*localStorage\.getItem\(['"]token['"]\)/g;
      if (tripleTokenPattern.test(content)) {
        content = content.replace(tripleTokenPattern, "localStorage.getItem('auth_token') || localStorage.getItem('token')");
        changed = true;
      }
      
      const tripleUserPattern = /localStorage\.getItem\(['"]user_data['"]\)\s*\|\|\s*localStorage\.getItem\(['"]user['"]\)\s*\|\|\s*localStorage\.getItem\(['"]user_data['"]\)/g;
      if (tripleUserPattern.test(content)) {
        content = content.replace(tripleUserPattern, "localStorage.getItem('user_data') || localStorage.getItem('user')");
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        fixedFiles.push(relativePath);
        console.log(`✅ ${relativePath}`);
      }
      
    } catch (error) {
      console.error(`❌ خطأ في ${filePath}:`, error.message);
    }
  }
  
  console.log(`\n🎉 تم إصلاح ${fixedFiles.length} ملف!`);
  
  return fixedFiles.length;
}

advancedStorageFix().catch(console.error);