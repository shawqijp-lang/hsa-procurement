import { Router } from 'express';
import ExcelJS from 'exceljs';
// تم تعطيل هذا الملف مؤقتاً - يستخدم النظام server/routes.ts للتصدير
// import { authenticateToken } from '../routes';
import { db } from '../db';
import { 
  dailyChecklists, 
  checklistTemplates, 
  locations, 
  users,
  masterEvaluations,
  checklistTasks
} from '../../shared/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';

const router = Router();

/**
 * 📊 إنشاء تقرير Excel التفصيلي المحسن - مطابق لتصميم PDF
 * يتضمن جميع الميزات والتصميم الموجود في PDF
 */
router.post('/detailed-excel-report', authenticateToken, async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      locationIds, 
      userIds: selectedUserIds 
    } = req.body;

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'غير مصرح' });
    }

    console.log(`📋 [تقرير Excel محسن] بدء إنشاء التقرير التفصيلي للمستخدم: ${user.username}`);
    console.log(`📋 [تقرير Excel محسن] المعايير:`, { startDate, endDate, locationIds, selectedUserIds });

    // ==========================================
    // 1️⃣ استخراج البيانات من النظام الموحد الجديد 🎯
    // ==========================================

    console.log('🎯 [تقرير Excel محسن] استخدام النظام الموحد master_evaluations');

    let evaluationQuery = db
      .select({
        evaluation: masterEvaluations,
        location: locations,
        user: users
      })
      .from(masterEvaluations)
      .leftJoin(locations, eq(masterEvaluations.locationId, locations.id))
      .leftJoin(users, eq(masterEvaluations.evaluatorId, users.id))
      .where(
        and(
          eq(masterEvaluations.companyId, user.companyId),
          gte(masterEvaluations.evaluationDate, startDate),
          lte(masterEvaluations.evaluationDate, endDate)
        )
      );

    // تطبيق فلاتر إضافية للنظام الموحد
    if (locationIds && locationIds.length > 0) {
      evaluationQuery = evaluationQuery.where(
        and(
          eq(masterEvaluations.companyId, user.companyId),
          gte(masterEvaluations.evaluationDate, startDate),
          lte(masterEvaluations.evaluationDate, endDate),
          inArray(masterEvaluations.locationId, locationIds.map((id: string) => parseInt(id)))
        )
      );
    }

    if (selectedUserIds && selectedUserIds.length > 0) {
      evaluationQuery = evaluationQuery.where(
        and(
          eq(masterEvaluations.companyId, user.companyId),
          gte(masterEvaluations.evaluationDate, startDate),
          lte(masterEvaluations.evaluationDate, endDate),
          inArray(masterEvaluations.evaluatorId, selectedUserIds.map((id: string) => parseInt(id)))
        )
      );
    }

    const evaluationsData = await evaluationQuery;
    console.log(`📋 [تقرير Excel محسن] تم استخراج ${evaluationsData.length} تقييم`);

    if (evaluationsData.length === 0) {
      return res.status(404).json({ message: 'لم يتم العثور على تقييمات للفترة المحددة' });
    }

    // استخراج مهام التقييم والقوالب
    const evaluationIds = evaluationsData.map(item => item.evaluation.id);
    
    const [tasksData, templatesData] = await Promise.all([
      db.select().from(checklistTasks).where(inArray(checklistTasks.evaluationId, evaluationIds)),
      db.select().from(checklistTemplates).where(eq(checklistTemplates.companyId, user.companyId))
    ]);

    console.log(`📋 [تقرير Excel محسن] تم استخراج ${tasksData.length} مهمة و ${templatesData.length} قالب`);

    // ==========================================
    // 2️⃣ إنشاء ملف Excel الجديد
    // ==========================================

    const workbook = new ExcelJS.Workbook();
    
    // ورقة التقرير الرئيسية
    const mainSheet = workbook.addWorksheet('📋 التقرير التفصيلي المحسن', {
      properties: { rtl: true },
      pageSetup: { 
        orientation: 'landscape',
        paperSize: 9, // A4
        margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75 }
      }
    });

    // ==========================================
    // 3️⃣ بناء البيانات المنظمة
    // ==========================================

    const processedData = buildReportData(evaluationsData, tasksData, templatesData);
    
    // ==========================================
    // 4️⃣ إنشاء التقرير بتصميم PDF
    // ==========================================

    await createPDFStyleReport(mainSheet, processedData, { startDate, endDate });

    // ==========================================
    // 5️⃣ إرسال الملف
    // ==========================================

    const buffer = await workbook.xlsx.writeBuffer();
    
    // استخدام توقيت الرياض بدلاً من GMT
    const localDate = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Riyadh'
    });
    const filename = `التقرير_التفصيلي_المحسن_${localDate}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    console.log(`✅ [تقرير Excel محسن] تم إنشاء التقرير التفصيلي بنجاح: ${filename}`);
    
    return res.send(buffer);

  } catch (error) {
    console.error('❌ [تقرير Excel محسن] خطأ في إنشاء التقرير:', error);
    return res.status(500).json({ 
      message: 'خطأ في إنشاء التقرير التفصيلي',
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

/**
 * 🔄 بناء البيانات المنظمة للتقرير
 */
function buildReportData(evaluationsData: any[], tasksData: any[], templatesData: any[]) {
  const locationGroups: { [key: number]: any } = {};
  
  // تجميع التقييمات حسب الموقع
  evaluationsData.forEach(item => {
    const locationId = item.evaluation.locationId;
    if (!locationGroups[locationId]) {
      locationGroups[locationId] = {
        location: item.location,
        evaluations: []
      };
    }
    
    // معالجة مهام التقييم
    const evaluationTasks = tasksData
      .filter(task => task.evaluationId === item.evaluation.id)
      .map(task => {
        const template = templatesData.find(t => t.id === task.templateId);
        
        let subTaskRatings = [];
        try {
          if (task.subTaskRatings) {
            subTaskRatings = typeof task.subTaskRatings === 'string' 
              ? JSON.parse(task.subTaskRatings) 
              : task.subTaskRatings;
            
            // إذا لم تكن أسماء المهام الفرعية موجودة، احصل عليها من القالب
            if (template && template.multiTasks && Array.isArray(template.multiTasks)) {
              subTaskRatings = subTaskRatings.map((subTask: any, index: number) => {
                if (!subTask.taskName && template.multiTasks[index]) {
                  return {
                    ...subTask,
                    taskName: template.multiTasks[index].ar || `مهمة فرعية ${index + 1}`
                  };
                }
                return subTask;
              });
            }
          }
        } catch (e) {
          console.warn('⚠️ خطأ في تحليل المهام الفرعية:', e);
          subTaskRatings = [];
        }

        return {
          id: task.id,
          nameAr: template?.taskAr || 'مهمة غير محددة',
          categoryAr: template?.categoryAr || 'فئة غير محددة',
          rating: task.rating || 0,
          completed: task.completed || false,
          comment: task.itemComment || '',
          subTasks: subTaskRatings,
          template: template
        };
      });

    console.log(`🔍 تتبع التقييم قبل الإضافة - evaluation.id: ${item.evaluation.id}, evaluation_notes: "${item.evaluation.evaluation_notes}"`);
    locationGroups[locationId].evaluations.push({
      ...item.evaluation,
      user: item.user,
      tasks: evaluationTasks
    });
  });

  return Object.values(locationGroups);
}

/**
 * 🎨 إنشاء التقرير بتصميم PDF المحسن
 */
async function createPDFStyleReport(sheet: ExcelJS.Worksheet, data: any[], options: any) {
  let currentRow = 1;
  
  // ==========================================
  // 📋 رأس التقرير - مطابق لـ PDF
  // ==========================================
  
  currentRow = await createReportHeader(sheet, currentRow, data, options);
  
  // ==========================================
  // 📊 الإحصائيات العامة مع الرموز التعبيرية
  // ==========================================
  
  currentRow = await createGeneralStatistics(sheet, currentRow, data);
  
  // ==========================================
  // 📍 تفاصيل كل موقع
  // ==========================================
  
  for (const locationData of data) {
    currentRow = await createLocationDetails(sheet, currentRow, locationData);
    currentRow += 2; // مساحة فاصلة
  }
  
  // ==========================================
  // 📈 التحليل الإجمالي النهائي
  // ==========================================
  
  currentRow = await createFinalAnalysis(sheet, currentRow, data);
  
  // تنسيق عرض الأعمدة
  formatColumns(sheet);
}

/**
 * 📋 إنشاء رأس التقرير
 */
async function createReportHeader(sheet: ExcelJS.Worksheet, startRow: number, data: any[], options: any): Promise<number> {
  let currentRow = startRow;
  
  // عنوان رئيسي
  sheet.mergeCells(`A${currentRow}:M${currentRow}`);
  const titleCell = sheet.getCell(currentRow, 1);
  titleCell.value = '📋 التقرير التفصيلي الشامل للتقييمات - نظام هائل سعيد أنعم وشركاه';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E7D32' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = {
    top: { style: 'thick' }, bottom: { style: 'thick' },
    left: { style: 'thick' }, right: { style: 'thick' }
  };
  currentRow += 2;
  
  // معلومات التقرير الأساسية
  const totalEvaluations = data.reduce((sum, loc) => sum + loc.evaluations.length, 0);
  const totalLocations = data.length;
  // استخدام توقيت الرياض
  const currentDate = new Date().toLocaleDateString('ar-EG', {
    calendar: 'gregory',
    timeZone: 'Asia/Riyadh'
  });
  
  const headerInfo = [
    ['📅 تاريخ إنشاء التقرير:', currentDate],
    ['👤 تم إنشاؤه بواسطة:', 'مدير الشؤون الادارية'],
    ['📊 إجمالي التقييمات:', totalEvaluations.toString()],
    ['📍 عدد المواقع:', totalLocations.toString()],
    ['👥 عدد المستخدمين:', '1'],
    ['📅 الفترة الزمنية:', `من ${options.startDate} إلى ${options.endDate}`]
  ];
  
  headerInfo.forEach(([label, value]) => {
    const labelCell = sheet.getCell(currentRow, 1);
    const valueCell = sheet.getCell(currentRow, 5);
    
    labelCell.value = label;
    labelCell.font = { bold: true, size: 11, name: 'Arial' };
    labelCell.alignment = { horizontal: 'right' };
    
    valueCell.value = value;
    valueCell.font = { size: 11, name: 'Arial' };
    valueCell.alignment = { horizontal: 'right' };
    
    currentRow++;
  });
  
  return currentRow + 2;
}

/**
 * 📊 إنشاء الإحصائيات العامة مع الرموز التعبيرية
 */
async function createGeneralStatistics(sheet: ExcelJS.Worksheet, startRow: number, data: any[]): Promise<number> {
  let currentRow = startRow;
  
  // حساب الإحصائيات الشاملة
  let totalTasks = 0;
  let completedTasks = 0;
  let totalRating = 0;
  let ratedTasks = 0;
  let totalSubTasks = 0;
  let highRatingTasks = 0;
  let lowRatingTasks = 0;
  let tasksWithComments = 0;
  
  data.forEach(locationData => {
    locationData.evaluations.forEach((evaluation: any) => {
      evaluation.tasks.forEach((task: any) => {
        totalTasks++;
        if (task.completed) completedTasks++;
        if (task.rating > 0) {
          totalRating += task.rating;
          ratedTasks++;
          if (task.rating >= 4) highRatingTasks++;
          if (task.rating <= 2) lowRatingTasks++;
        }
        if (task.subTasks) totalSubTasks += task.subTasks.length;
        if (task.comment && task.comment.trim()) tasksWithComments++;
      });
    });
  });
  
  const averageRating = ratedTasks > 0 ? (totalRating / ratedTasks).toFixed(2) : '0.00';
  
  // عنوان الإحصائيات
  sheet.mergeCells(`A${currentRow}:M${currentRow}`);
  const statsTitle = sheet.getCell(currentRow, 1);
  statsTitle.value = '📊 الإحصائيات العامة الشاملة';
  statsTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  statsTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B35' } };
  statsTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  currentRow += 2;
  
  // الإحصائيات مع الرموز التعبيرية
  const stats = [
    [`🎯 إجمالي المهام:`, totalTasks.toString()],
    [`✅ المهام المكتملة:`, `${completedTasks}/${totalTasks} (${totalTasks > 0 ? Math.round((completedTasks/totalTasks)*100) : 0}%)`],
    [`⭐ متوسط التقييم:`, `${averageRating}/4`],
    [`📊 المهام الفرعية:`, totalSubTasks.toString()],
    [`🟢 تقييمات عالية:`, `${highRatingTasks} مهام (4 نقاط)`],
    [`🔴 تقييمات منخفضة:`, `${lowRatingTasks} مهام (1-2 نقاط)`],
    [`📝 ملاحظات عامة:`, tasksWithComments.toString()]
  ];
  
  stats.forEach(([label, value]) => {
    const labelCell = sheet.getCell(currentRow, 2);
    const valueCell = sheet.getCell(currentRow, 8);
    
    labelCell.value = label;
    labelCell.font = { bold: true, size: 11, name: 'Arial' };
    labelCell.alignment = { horizontal: 'right' };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E0' } };
    
    valueCell.value = value;
    valueCell.font = { size: 11, name: 'Arial', bold: true, color: { argb: '2E7D32' } };
    valueCell.alignment = { horizontal: 'center' };
    
    [labelCell, valueCell].forEach(cell => {
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    
    currentRow++;
  });
  
  return currentRow + 2;
}

/**
 * 📍 إنشاء تفاصيل كل موقع
 */
async function createLocationDetails(sheet: ExcelJS.Worksheet, startRow: number, locationData: any): Promise<number> {
  let currentRow = startRow;
  
  // عنوان الموقع
  sheet.mergeCells(`A${currentRow}:M${currentRow}`);
  const locationTitle = sheet.getCell(currentRow, 1);
  locationTitle.value = `📍 ${locationData.location?.nameAr || 'موقع غير محدد'}`;
  locationTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFF' } };
  locationTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1976D2' } };
  locationTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  currentRow += 2;
  
  // تفاصيل كل تقييم في الموقع
  for (const evaluation of locationData.evaluations) {
    currentRow = await createEvaluationDetails(sheet, currentRow, evaluation, locationData.location);
    currentRow += 1;
  }
  
  return currentRow;
}

/**
 * 📋 إنشاء تفاصيل التقييم الواحد
 */
async function createEvaluationDetails(sheet: ExcelJS.Worksheet, startRow: number, evaluation: any, location: any): Promise<number> {
  let currentRow = startRow;
  
  // رأس التقييم مع معلومات المقيّم
  sheet.mergeCells(`A${currentRow}:M${currentRow}`);
  const evalHeader = sheet.getCell(currentRow, 1);
  const evalDate = new Date(evaluation.checklistDate).toLocaleDateString('ar-EG', { 
    calendar: 'gregory',
    timeZone: 'Asia/Riyadh'
  });
  const evalTime = evaluation.evaluationTime || (evaluation.evaluationDateTime ? new Date(evaluation.evaluationDateTime).toLocaleTimeString('ar-EG', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Asia/Riyadh'
  }) : '');
  
  evalHeader.value = `📋 تقييم: ${location?.nameAr || 'موقع غير محدد'} | التاريخ: ${evalDate} ${evalTime}ص | المقيم: ${evaluation.user?.fullName || evaluation.user?.username || 'مستخدم غير محدد'}`;
  evalHeader.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  evalHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '8BC34A' } };
  evalHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  currentRow += 2;
  
  // إحصائيات هذا التقييم
  const evalTotalTasks = evaluation.tasks.length;
  const evalCompletedTasks = evaluation.tasks.filter((t: any) => t.completed).length;
  const evalTotalSubTasks = evaluation.tasks.reduce((sum: number, t: any) => sum + (t.subTasks?.length || 0), 0);
  const evalAvgRating = evalTotalTasks > 0 ? (evaluation.tasks.reduce((sum: number, t: any) => sum + (t.rating || 0), 0) / evalTotalTasks).toFixed(2) : '0.00';
  const evalHighRating = evaluation.tasks.filter((t: any) => (t.rating || 0) >= 4).length;
  const evalLowRating = evaluation.tasks.filter((t: any) => (t.rating || 0) <= 2 && (t.rating || 0) > 0).length;
  const evalComments = evaluation.tasks.filter((t: any) => t.comment && t.comment.trim()).length;
  
  const evalStats = [
    [`🎯 إجمالي المهام:`, evalTotalTasks.toString()],
    [`✅ المهام المكتملة:`, `${evalCompletedTasks}/${evalTotalTasks} (${evalTotalTasks > 0 ? Math.round((evalCompletedTasks/evalTotalTasks)*100) : 0}%)`],
    [`⭐ متوسط التقييم:`, `${evalAvgRating}/5`],
    [`📊 المهام الفرعية:`, evalTotalSubTasks.toString()],
    [`🟢 تقييمات عالية:`, `${evalHighRating} مهام (5-4 نقاط)`],
    [`🔴 تقييمات منخفضة:`, `${evalLowRating} مهام (2-1 نقطة)`],
    [`📝 ملاحظات عامة:`, evalComments.toString()]
  ];
  
  evalStats.forEach(([label, value]) => {
    const labelCell = sheet.getCell(currentRow, 3);
    const valueCell = sheet.getCell(currentRow, 8);
    
    labelCell.value = label;
    labelCell.font = { bold: true, size: 10, name: 'Arial' };
    labelCell.alignment = { horizontal: 'right' };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F5E8' } };
    
    valueCell.value = value;
    valueCell.font = { size: 10, name: 'Arial', bold: true, color: { argb: '2E7D32' } };
    valueCell.alignment = { horizontal: 'center' };
    
    [labelCell, valueCell].forEach(cell => {
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    
    currentRow++;
  });
  
  currentRow += 1;
  
  // جدول المهام التفصيلي (مع تمرير بيانات التقييم للحصول على الملاحظات العامة)
  currentRow = await createTasksTable(sheet, currentRow, evaluation.tasks, evaluation);
  
  return currentRow;
}

/**
 * 📋 إنشاء جدول المهام التفصيلي
 */
async function createTasksTable(sheet: ExcelJS.Worksheet, startRow: number, tasks: any[], evaluation?: any): Promise<number> {
  let currentRow = startRow;
  
  // عناوين الجدول
  const headers = ['المهمة والتفاصيل 🎯', 'التقييم ⭐', 'ملاحظات 📝'];
  headers.forEach((header, index) => {
    const cell = sheet.getCell(currentRow, index + 3);
    cell.value = header;
    cell.font = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '455A64' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thick' }, bottom: { style: 'thick' },
      left: { style: 'thick' }, right: { style: 'thick' }
    };
  });
  currentRow++;
  
  // بيانات المهام
  tasks.forEach(task => {
    // المهمة الرئيسية
    const taskCell = sheet.getCell(currentRow, 3);
    const ratingCell = sheet.getCell(currentRow, 4);
    const commentCell = sheet.getCell(currentRow, 5);
    
    taskCell.value = `${task.nameAr} 🎯`;
    taskCell.font = { bold: true, size: 10, name: 'Arial' };
    taskCell.alignment = { horizontal: 'right', vertical: 'top' };
    
    ratingCell.value = `${task.rating || 0}/4`;
    ratingCell.font = { bold: true, size: 11, name: 'Arial' };
    ratingCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // تلوين حسب التقييم
    if (task.rating >= 4) {
      ratingCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C8E6C9' } };
    } else if (task.rating >= 3) {
      ratingCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0B2' } };
    } else if (task.rating > 0) {
      ratingCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCDD2' } };
    }
    
    // ملاحظات التقييم العامة (تُظهر ملاحظة واحدة لكل مهام التقييم)
    console.log(`🔍 تتبع الملاحظات - evaluation.id: ${evaluation?.id}, evaluation_notes: "${evaluation?.evaluation_notes}"`);
    commentCell.value = evaluation?.evaluation_notes || '';
    commentCell.font = { size: 10, name: 'Arial' };
    commentCell.alignment = { horizontal: 'right', vertical: 'top' };
    
    [taskCell, ratingCell, commentCell].forEach(cell => {
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    
    currentRow++;
    
    // المهام الفرعية
    if (task.subTasks && task.subTasks.length > 0) {
      task.subTasks.forEach((subTask: any) => {
        const subTaskCell = sheet.getCell(currentRow, 3);
        const subRatingCell = sheet.getCell(currentRow, 4);
        const subCommentCell = sheet.getCell(currentRow, 5);
        
        subTaskCell.value = `${subTask.taskName || 'مهمة فرعية'} ↳`;
        subTaskCell.font = { size: 9, name: 'Arial', color: { argb: '555555' } };
        subTaskCell.alignment = { horizontal: 'right', vertical: 'top' };
        
        subRatingCell.value = `${subTask.rating || 0}/4`;
        subRatingCell.font = { size: 10, name: 'Arial' };
        subRatingCell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        // تلوين المهام الفرعية
        if (subTask.rating >= 4) {
          subRatingCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F5E8' } };
        } else if (subTask.rating >= 3) {
          subRatingCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8E1' } };
        } else if (subTask.rating > 0) {
          subRatingCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBEE' } };
        }
        
        // ملاحظات التقييم العامة (نفس الملاحظة للمهام الفرعية)
        subCommentCell.value = evaluation?.evaluation_notes || '';
        subCommentCell.font = { size: 9, name: 'Arial', color: { argb: '666666' } };
        subCommentCell.alignment = { horizontal: 'right', vertical: 'top' };
        
        [subTaskCell, subRatingCell, subCommentCell].forEach(cell => {
          cell.border = {
            top: { style: 'hair' }, bottom: { style: 'hair' },
            left: { style: 'thin' }, right: { style: 'thin' }
          };
        });
        
        currentRow++;
      });
    }
  });
  
  return currentRow + 1;
}

/**
 * 📈 إنشاء التحليل الإجمالي النهائي
 */
async function createFinalAnalysis(sheet: ExcelJS.Worksheet, startRow: number, data: any[]): Promise<number> {
  let currentRow = startRow;
  
  // عنوان التحليل
  sheet.mergeCells(`A${currentRow}:M${currentRow}`);
  const analysisTitle = sheet.getCell(currentRow, 1);
  analysisTitle.value = '📈 التحليل الإجمالي للتقرير التفصيلي';
  analysisTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  analysisTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7B1FA2' } };
  analysisTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  currentRow += 2;
  
  // حساب الإحصائيات النهائية
  let grandTotalTasks = 0;
  let grandCompletedTasks = 0;
  let grandTotalRating = 0;
  let grandRatedTasks = 0;
  let totalEvaluations = 0;
  let totalLocations = data.length;
  
  data.forEach(locationData => {
    locationData.evaluations.forEach((evaluation: any) => {
      totalEvaluations++;
      evaluation.tasks.forEach((task: any) => {
        grandTotalTasks++;
        if (task.completed) grandCompletedTasks++;
        if (task.rating > 0) {
          grandTotalRating += task.rating;
          grandRatedTasks++;
        }
      });
    });
  });
  
  const grandAverage = grandRatedTasks > 0 ? (grandTotalRating / grandRatedTasks).toFixed(2) : '0.00';
  
  // الإحصائيات النهائية
  const finalStats = [
    ['📊 إجمالي المهام عبر جميع التقييمات:', grandTotalTasks.toString()],
    ['✅ إجمالي المهام المكتملة:', `${grandCompletedTasks}/${grandTotalTasks} (${grandTotalTasks > 0 ? Math.round((grandCompletedTasks/grandTotalTasks)*100) : 0}%)`],
    ['⭐ المتوسط العام للتقييمات:', `${grandAverage}/5`],
    ['📋 عدد التقييمات المشمولة:', totalEvaluations.toString()],
    ['📍 عدد المواقع المغطاة:', totalLocations.toString()]
  ];
  
  finalStats.forEach(([label, value]) => {
    const labelCell = sheet.getCell(currentRow, 2);
    const valueCell = sheet.getCell(currentRow, 8);
    
    labelCell.value = label;
    labelCell.font = { bold: true, size: 12, name: 'Arial' };
    labelCell.alignment = { horizontal: 'right' };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3E5F5' } };
    
    valueCell.value = value;
    valueCell.font = { size: 12, name: 'Arial', bold: true, color: { argb: '7B1FA2' } };
    valueCell.alignment = { horizontal: 'center' };
    
    [labelCell, valueCell].forEach(cell => {
      cell.border = {
        top: { style: 'thick' }, bottom: { style: 'thick' },
        left: { style: 'thick' }, right: { style: 'thick' }
      };
    });
    
    currentRow++;
  });
  
  return currentRow;
}

/**
 * 🎨 تنسيق عرض الأعمدة
 */
function formatColumns(sheet: ExcelJS.Worksheet) {
  // تعيين عرض الأعمدة
  sheet.getColumn(1).width = 3;   // مساحة
  sheet.getColumn(2).width = 25;  // التسميات
  sheet.getColumn(3).width = 35;  // المهام
  sheet.getColumn(4).width = 12;  // التقييم
  sheet.getColumn(5).width = 25;  // التعليق
  sheet.getColumn(6).width = 5;   // مساحة
  sheet.getColumn(7).width = 5;   // مساحة
  sheet.getColumn(8).width = 20;  // القيم
  sheet.getColumn(9).width = 5;   // مساحة
  sheet.getColumn(10).width = 5;  // مساحة
  sheet.getColumn(11).width = 5;  // مساحة
  sheet.getColumn(12).width = 5;  // مساحة
  sheet.getColumn(13).width = 5;  // مساحة
}

export default router;