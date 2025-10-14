/**
 * أداة تحويل البيانات القديمة للتقارير التفصيلية
 * تحويل المهام الفرعية من النص المجمع إلى بيانات منفصلة
 */

import { db } from './db.js';
import { dailyChecklists, checklistTemplates } from '@shared/schema.js';
import { eq } from 'drizzle-orm';

async function migrateOldEvaluationData() {
  console.log('🔄 بدء تحويل البيانات القديمة...');
  
  try {
    // جلب جميع التقييمات
    const evaluations = await db
      .select()
      .from(dailyChecklists)
      .orderBy(dailyChecklists.createdAt);
      
    console.log(`📊 تم العثور على ${evaluations.length} تقييم`);
    
    let convertedCount = 0;
    
    for (const evaluation of evaluations) {
      if (!evaluation.tasks || !Array.isArray(evaluation.tasks)) {
        continue;
      }
      
      let hasChanges = false;
      const updatedTasks = evaluation.tasks.map(task => {
        // التحقق من وجود المهام الفرعية كنص
        if (task.subTaskRatings && typeof task.subTaskRatings === 'string') {
          console.log(`🔍 تحويل مهام فرعية للمهمة ${task.templateId}`);
          
          // استخراج المهام الفرعية من النص
          const subtaskMatches = task.subTaskRatings.match(/• (.+?) \((\d+)\/5\)/g);
          
          if (subtaskMatches) {
            const convertedSubtasks = subtaskMatches.map((match, index) => {
              const nameMatch = match.match(/• (.+?) \(/);
              const ratingMatch = match.match(/\((\d+)\/5\)/);
              
              return {
                taskIndex: index,
                taskName: nameMatch ? nameMatch[1] : `مهمة فرعية ${index + 1}`,
                rating: ratingMatch ? parseInt(ratingMatch[1]) : 0
              };
            });
            
            task.subTaskRatings = convertedSubtasks;
            hasChanges = true;
          }
        }
        
        return task;
      });
      
      // تحديث التقييم في قاعدة البيانات
      if (hasChanges) {
        await db
          .update(dailyChecklists)
          .set({ tasks: updatedTasks })
          .where(eq(dailyChecklists.id, evaluation.id));
          
        convertedCount++;
        console.log(`✅ تم تحويل التقييم ${evaluation.id}`);
      }
    }
    
    console.log(`🎉 تم تحويل ${convertedCount} تقييم بنجاح!`);
    return { success: true, convertedCount };
    
  } catch (error) {
    console.error('❌ خطأ في تحويل البيانات:', error);
    return { success: false, error: error.message };
  }
}

// تشغيل التحويل
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateOldEvaluationData()
    .then(result => {
      console.log('📊 نتائج التحويل:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 فشل التحويل:', error);
      process.exit(1);
    });
}

export { migrateOldEvaluationData };