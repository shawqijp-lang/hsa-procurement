/**
 * 🧪 اختبار النظام الموحد للتقييمات
 */

// استيراد unifiedLocalService مباشرة
const fs = require('fs');
const path = require('path');

// بدلاً من استيراد، سنحاول استخدام المتصفح مباشرة
console.log('🧪 سكريبت اختبار النظام الموحد');
console.log('📋 قم بتنفيذ الاختبارات التالية في المتصفح:');
console.log(`
// 1. افتح Developer Console في المتصفح
// 2. نفذ الكود التالي:

// إنشاء تقييم تجريبي
const testEvaluation = {
  id: 'unified_test_' + Date.now(),
  locationId: 523,
  locationNameAr: 'اختبار النظام الموحد',
  locationNameEn: 'Unified System Test',
  evaluatorId: 43,
  evaluatorName: 'owner',
  companyId: 6,
  evaluationDateTime: new Date().toISOString(),
  evaluationDate: new Date().toISOString().split('T')[0],
  evaluationTime: new Date().toLocaleTimeString('ar-EG', {hour12: false}),
  evaluation: {
    categoryEn: 'Test Category',
    categoryAr: 'فئة الاختبار',
    tasks: [{
      taskEn: 'Test Task',
      taskAr: 'مهمة اختبار',
      result: 5,
      notes: 'تقييم تجريبي'
    }]
  },
  generalNotes: 'تقييم تجريبي للنظام الموحد',
  overallRating: 5,
  syncStatus: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

console.log('🧪 إنشاء تقييم تجريبي:', testEvaluation);

// محاولة حفظ باستخدام النظام الموحد المحلي
async function testUnifiedSystem() {
  try {
    // استيراد الخدمة
    const { unifiedLocalService } = await import('./client/src/lib/unifiedLocalService.ts');
    
    // حفظ التقييم
    const saved = await unifiedLocalService.saveUnifiedEvaluation(testEvaluation);
    console.log('✅ تم حفظ التقييم محلياً:', saved);
    
    // جلب التقييمات المحفوظة
    const evaluations = await unifiedLocalService.getUnifiedEvaluations();
    console.log('📋 التقييمات المحفوظة:', evaluations.length);
    
    // جلب التقييمات بحاجة للمزامنة
    const pending = await unifiedLocalService.getPendingSyncEvaluations();
    console.log('🔄 تقييمات بحاجة للمزامنة:', pending.length);
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
  }
}

// تنفيذ الاختبار
testUnifiedSystem();

// للاختبار اليدوي في المتصفح:
// 1. افتح /client/src/pages/enhanced-location-checklist.tsx
// 2. ابحث عن useUnifiedLocalSystem
// 3. استخدم saveEvaluation function
`);