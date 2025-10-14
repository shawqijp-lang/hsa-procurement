import * as XLSX from 'xlsx';
import { formatReportDateTime, formatReportDate, formatReportTime, generateReportFilename } from './date-utils';

interface LocationReport {
  nameAr: string;
  nameEn: string;
  icon?: string;
  totalEvaluations: number;
  uniqueUsers: number;
  completionRate: number;
  averageRating: number;
  highestRating?: number;
  lowestRating?: number;
  dailyReports: DailyReport[];
}

interface DailyReport {
  date?: string;
  dateFormatted: string;
  userFullName: string;
  completionRate: number;
  averageRating: number;
  completedTasks?: number;
  totalTasks?: number;
  finalScore?: number;
  progressPercentage?: number;
  tasks: TaskDetail[];
  evaluationNotes: string;
}

interface TaskDetail {
  categoryAr: string;
  taskAr: string;
  completed: boolean;
  rating: number;
  ratingText: string;
  isAutomatic?: boolean;
  multiTasks?: string[];
  finalScore?: number;
  notes?: string;
}

interface ReportData {
  period: string;
  generatedAt: string;
  totalLocations: number;
  totalUsers: number;
  totalEvaluations: number;
  uniqueUsers: number;
  overallCompletionRate?: number;
  overallAverageRating?: number;
  overallAverageFinalScore?: number;
  totalDays?: number;
  averageDailyEvaluations?: number;
  highestCompletionRate?: number;
  lowestCompletionRate?: number;
  automaticItemsCount?: number;
  manualItemsCount?: number;
  locations: LocationReport[];
}

// Helper functions for enhanced Arabic Excel export
function getLocationTypeArabic(icon: string): string {
  const typeMap: { [key: string]: string } = {
    'home': 'سكن',
    'building': 'مبنى إداري',
    'clinic-medical': 'عيادة طبية',
    'chef-hat': 'مطبخ',
    'droplets': 'دورات مياه',
    'utensils': 'منطقة طعام',
    'package': 'مخزن',
    'map-pin': 'موقع عام'
  };
  return typeMap[icon] || 'موقع عام';
}

function getPerformanceRating(value: number, type: string): string {
  switch(type) {
    case 'completion':
      if (value >= 90) return 'ممتاز';
      if (value >= 75) return 'جيد جداً';
      if (value >= 60) return 'جيد';
      if (value >= 40) return 'مقبول';
      return 'ضعيف';
    case 'finalScore':
      if (value >= 90) return 'ممتاز 🌟';
      if (value >= 75) return 'جيد 👍';
      if (value >= 50) return 'مقبول ⚠️';
      return 'ضعيف ❌';
    case 'rating':
      if (value >= 3.5) return 'ممتاز';
      if (value >= 3.0) return 'جيد جداً';
      if (value >= 2.5) return 'جيد';
      if (value >= 2.0) return 'مقبول';
      return 'ضعيف';
    case 'evaluations':
      if (value >= 20) return 'نشاط عالي';
      if (value >= 10) return 'نشاط متوسط';
      if (value >= 5) return 'نشاط منخفض';
      return 'نشاط محدود';
    case 'users':
      if (value >= 5) return 'تفاعل عالي';
      if (value >= 3) return 'تفاعل متوسط';
      if (value >= 2) return 'تفاعل منخفض';
      return 'تفاعل محدود';
    default:
      return '';
  }
}

function getRatingTextArabic(rating: number): string {
  if (rating >= 3.5) return '(ممتاز)';
  if (rating >= 3.0) return '(جيد جداً)';
  if (rating >= 2.5) return '(جيد)';
  if (rating >= 2.0) return '(مقبول)';
  return '(ضعيف)';
}

// Using Gregorian calendar only for consistent date formatting

export async function exportToExcel(reportData: ReportData, filename: string): Promise<void> {
  try {
    console.log('📊 Starting Enhanced Arabic RTL Excel export with data:', reportData);
    
    // Enhanced validation with detailed checks
    if (!reportData || typeof reportData !== 'object') {
      throw new Error('بيانات التقرير غير صحيحة أو مفقودة');
    }
    
    if (!reportData.locations || !Array.isArray(reportData.locations)) {
      console.warn('⚠️ No locations data found, creating empty report');
      reportData.locations = [];
    }

    // Memory check for large datasets
    const estimatedSize = JSON.stringify(reportData).length;
    if (estimatedSize > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('حجم البيانات كبير جداً - يرجى تحديد فترة زمنية أقصر');
    }
    
    const workbook = XLSX.utils.book_new();
    
    // Set workbook properties for RTL and Arabic support
    workbook.Props = {
      Title: 'تقرير نظام بيئة العمل - HSA GROUP',
      Subject: 'نظام بيئة العمل والصيانة',
      Author: 'HSA GROUP',
      Manager: 'مجموعة HSA',
      Company: 'HSA GROUP',
      Category: 'تقارير بيئة العمل والصيانة',
      Keywords: 'تقييم, بيئة عمل, صيانة, إدارة, HSA',
      Comments: 'تقرير شامل لنظام بيئة العمل والصيانة مع تحليل مفصل للأداء',
      CreatedDate: new Date(),
      ModifiedDate: new Date()
    };
    
    // Enhanced Arabic RTL Summary Sheet
    const summaryData = [
      // Header section with enhanced formatting
      ['نظام بيئة العمل والصيانة - HSA GROUP'],
      ['تقرير شامل للأداء والتقييمات'],
      [''],
      ['معلومات التقرير'],
      ['الفترة:', reportData.period || 'غير محدد'],
      ['تاريخ التوليد:', formatReportDate()],
      ['وقت التوليد:', formatReportTime()],
      ['التوقيت المحلي:', formatReportDateTime()],
      [''],
      ['ملخص الإحصائيات العامة'],
      ['البيان', 'القيمة', 'الوحدة'],
      ['إجمالي المواقع المُقيَّمة', reportData.totalLocations || 0, 'موقع'],
      ['إجمالي المستخدمين', reportData.totalUsers || 0, 'مستخدم'],
      ['إجمالي عمليات التقييم', reportData.totalEvaluations || 0, 'تقييم'],
      ['عدد المستخدمين النشطين', reportData.uniqueUsers || 0, 'مستخدم'],
      ['نسبة الإكمال العامة', `${reportData.overallCompletionRate || 0}%`, 'نسبة مئوية'],
      ['متوسط التقييم العام', `${reportData.overallAverageRating || 0}/4`, 'نجوم'],
      [''],
      ['معلومات إضافية'],
      ['عدد الأيام المُقيَّمة', reportData.totalDays || 0, 'يوم'],
      ['متوسط التقييمات اليومية', reportData.averageDailyEvaluations || 0, 'تقييم/يوم'],
      ['أعلى نسبة إكمال', `${reportData.highestCompletionRate || 0}%`, 'نسبة مئوية'],
      ['أقل نسبة إكمال', `${reportData.lowestCompletionRate || 0}%`, 'نسبة مئوية'],
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Enhanced RTL column settings with proper Arabic alignment
    summarySheet['!cols'] = [
      { width: 40 }, // البيان - wider for Arabic text
      { width: 25 }, // القيمة 
      { width: 20 }  // الوحدة
    ];
    
    // Apply RTL formatting and styles
    const summaryRange = XLSX.utils.decode_range(summarySheet['!ref'] || 'A1');
    for (let R = summaryRange.s.r; R <= summaryRange.e.r; ++R) {
      for (let C = summaryRange.s.c; C <= summaryRange.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
        if (!summarySheet[cellAddress]) continue;
        
        // Apply RTL and Arabic formatting
        summarySheet[cellAddress].s = {
          alignment: { 
            horizontal: 'right', 
            vertical: 'center',
            readingOrder: 2 // RTL
          },
          font: { 
            name: 'Arial Unicode MS',
            sz: R < 3 ? 14 : 11, // Larger font for headers
            bold: R < 3 || R === 9 || R === 17 // Bold for headers
          },
          fill: R === 9 ? { fgColor: { rgb: 'FEF3C7' } } : undefined // Yellow background for table header
        };
      }
    }
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'الملخص_العام');
    
    // Enhanced Location Details Sheets with Professional Arabic Layout
    if (reportData.locations && reportData.locations.length > 0) {
      reportData.locations.forEach((location, index) => {
        try {
          console.log(`📋 Processing location: ${location.nameAr || `موقع ${index + 1}`}`);
          
          const locationData = [
            // Header section with location info
            [`تفاصيل الموقع: ${location.nameAr || 'غير محدد'}`],
            [`الاسم الإنجليزي: ${location.nameEn || 'Not specified'}`],
            [`نوع الموقع: ${getLocationTypeArabic(location.icon || 'building')}`],
            [''],
            ['إحصائيات شاملة للموقع'],
            ['البيان', 'القيمة', 'الوحدة', 'التصنيف'],
            ['إجمالي عمليات التقييم', location.totalEvaluations || 0, 'تقييم', getPerformanceRating(location.totalEvaluations || 0, 'evaluations')],
            ['عدد المقيمين', location.uniqueUsers || 0, 'مستخدم', getPerformanceRating(location.uniqueUsers || 0, 'users')],
            ['نسبة الإكمال', `${location.completionRate || 0}%`, 'نسبة مئوية', getPerformanceRating(location.completionRate || 0, 'completion')],
            ['متوسط التقييم', `${location.averageRating || 0}/4`, 'نجوم', getPerformanceRating(location.averageRating || 0, 'rating')],
            ['أعلى تقييم مُسجل', `${location.highestRating || 0}/4`, 'نجوم', ''],
            ['أقل تقييم مُسجل', `${location.lowestRating || 0}/4`, 'نجوم', ''],
            [''],
            ['سجل التقييمات اليومية المفصل'],
            ['التاريخ الميلادي', 'اليوم', 'اسم المقيم', 'نسبة الإكمال', 'التقييم العام', 'عدد المهام المُنجزة', 'إجمالي المهام', 'الملاحظات والتعليقات']
          ];
          
          // Add enhanced daily reports with comprehensive Arabic data
          if (location.dailyReports && Array.isArray(location.dailyReports) && location.dailyReports.length > 0) {
            location.dailyReports.forEach(daily => {
              // Use the raw date field instead of formatted one
              let gregorianDate: Date;
              try {
                gregorianDate = daily.date ? new Date(daily.date) : new Date();
                // Check if date is valid
                if (isNaN(gregorianDate.getTime())) {
                  gregorianDate = new Date();
                }
              } catch {
                gregorianDate = new Date();
              }
              
              const dayName = gregorianDate.toLocaleDateString('en-US', { weekday: 'long', calendar: 'gregory' });
              
              locationData.push([
                gregorianDate.toLocaleDateString('en-US', { calendar: 'gregory' }), // التاريخ الميلادي
                dayName, // اليوم
                daily.userFullName || 'غير محدد', // اسم المقيم
                `${daily.completionRate || 0}%`, // نسبة الإكمال
                `${daily.averageRating || 0}/4 ${getRatingTextArabic(daily.averageRating || 0)}`, // التقييم العام
                daily.completedTasks || 0, // عدد المهام المُنجزة
                daily.totalTasks || 0, // إجمالي المهام
                daily.evaluationNotes || 'لا توجد ملاحظات' // الملاحظات
              ]);
            });
            
            // Add comprehensive task analysis section
            locationData.push([''], ['تحليل مفصل للمهام والأنشطة']);
            locationData.push([
              'التاريخ', 'التصنيف العربي', 'اسم المهمة', 'حالة الإنجاز', 
              'تقييم المهمة', 'وصف التقييم', 'الملاحظات الخاصة', 'وقت التقييم'
            ]);
            
            location.dailyReports.forEach(daily => {
              // Reuse the same date validation logic
              let evaluationDate: Date;
              try {
                evaluationDate = daily.date ? new Date(daily.date) : new Date();
                if (isNaN(evaluationDate.getTime())) {
                  evaluationDate = new Date();
                }
              } catch {
                evaluationDate = new Date();
              }
              
              if (daily.tasks && Array.isArray(daily.tasks)) {
                daily.tasks.forEach((task, taskIndex) => {
                  const evaluationTime = evaluationDate.toLocaleTimeString('en-US');
                  
                  locationData.push([
                    evaluationDate.toLocaleDateString('en-US', { calendar: 'gregory' }), // التاريخ
                    task.categoryAr || 'تصنيف عام', // التصنيف العربي
                    task.taskAr || 'مهمة غير محددة', // اسم المهمة
                    task.completed ? '✅ مُنجز بنجاح' : '❌ غير مُنجز', // حالة الإنجاز
                    `${task.rating || 0}/4`, // تقييم المهمة
                    task.ratingText || getRatingTextArabic(task.rating || 0), // وصف التقييم
                    task.notes || 'لا توجد ملاحظات خاصة', // الملاحظات الخاصة
                    evaluationTime // وقت التقييم
                  ]);
                });
              }
            });
          } else {
            locationData.push(['لا توجد تقييمات لهذا الموقع في هذه الفترة']);
          }
          
          const locationSheet = XLSX.utils.aoa_to_sheet(locationData);
          
          // Enhanced RTL column settings for Arabic content
          locationSheet['!cols'] = [
            { width: 35 }, // البيان/التاريخ - wider for Arabic text
            { width: 25 }, // القيمة/المقيم
            { width: 20 }, // الوحدة/اليوم
            { width: 30 }, // التصنيف/الإكمال
            { width: 25 }, // التقييم
            { width: 20 }, // عدد المهام
            { width: 20 }, // إجمالي المهام
            { width: 40 }, // الملاحظات - wider for notes
            { width: 20 }  // وقت التقييم
          ];
          
          // Apply RTL formatting to all cells
          const range = XLSX.utils.decode_range(locationSheet['!ref'] || 'A1');
          for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
              if (!locationSheet[cellAddress]) continue;
              
              locationSheet[cellAddress].s = {
                alignment: { 
                  horizontal: 'right', 
                  vertical: 'center',
                  readingOrder: 2 // RTL
                },
                font: { 
                  name: 'Arial Unicode MS',
                  sz: R < 4 ? 12 : 10, // Larger font for headers
                  bold: R < 4 || R === 5 || R === 13 || R === 16 // Bold for headers
                },
                fill: (R === 5 || R === 13 || R === 16) ? { fgColor: { rgb: 'E5F3FF' } } : undefined // Light blue for headers
              };
            }
          }
          
          // Create safe sheet name using Arabic name
          const arabicName = location.nameAr || `موقع_${index + 1}`;
          let safeName = arabicName
            .replace(/[^\u0600-\u06FF\w\s]/g, '') // Keep Arabic characters, letters, numbers, and spaces
            .replace(/\s+/g, '_')
            .substring(0, 20);
          
          // Fallback if safeName is empty
          if (!safeName || safeName.length === 0) {
            safeName = `موقع_${index + 1}`;
          }
          
          // Ensure sheet name is unique and valid (Excel limit: 31 chars)
          let finalSheetName = safeName.substring(0, 30);
          let counter = 1;
          while (workbook.SheetNames.includes(finalSheetName)) {
            const suffix = `_${counter}`;
            finalSheetName = `${safeName.substring(0, 30 - suffix.length)}${suffix}`;
            counter++;
          }
          
          XLSX.utils.book_append_sheet(workbook, locationSheet, finalSheetName);
        } catch (locationError) {
          console.error(`❌ Error processing location ${index + 1}:`, locationError);
          // Continue with next location
        }
      });
    } else {
      // Create empty locations sheet if no data
      const noDataSheet = XLSX.utils.aoa_to_sheet([
        ['لا توجد بيانات للعرض'],
        ['الفترة المحددة لا تحتوي على تقييمات']
      ]);
      XLSX.utils.book_append_sheet(workbook, noDataSheet, 'لا_توجد_بيانات');
    }
    
    // Set workbook properties
    workbook.Props = {
      Title: 'تقرير نظام بيئة العمل - HSA GROUP',
      Subject: 'Work Environment Management System Report',
      Author: 'HSA GROUP',
      Manager: 'HSA GROUP',
      Company: 'HSA GROUP',
      CreatedDate: new Date(),
      ModifiedDate: new Date()
    };
    
    // Generate Enhanced Arabic RTL Excel file with memory optimization
    console.log('💾 Generating Enhanced Arabic RTL Excel file...');
    let excelBuffer;
    
    try {
      // Progressive memory management for large files
      const writeOptions = {
        bookType: 'xlsx' as const,
        type: 'array' as const,
        Props: workbook.Props,
        bookSST: false, // Reduce memory usage
        cellStyles: true, // Enable styling
        compression: true // Enable compression
        // Enhanced memory management options handled by XLSX internally
      };

      // Use setTimeout to prevent blocking UI for large files
      excelBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        setTimeout(() => {
          try {
            const buffer = XLSX.write(workbook, writeOptions) as ArrayBuffer;
            resolve(buffer);
          } catch (error) {
            reject(error);
          }
        }, 0);
      });
      
      console.log('✅ Enhanced Arabic Excel buffer generated successfully, size:', new Uint8Array(excelBuffer).length, 'bytes');
    } catch (writeError) {
      console.error('❌ Enhanced Excel write error:', writeError);
      throw new Error('فشل في إنشاء ملف Excel المحسن - خطأ في الكتابة');
    }
    
    // Create enhanced Arabic-compatible blob and download
    try {
      const blob = new Blob([excelBuffer as ArrayBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      console.log('📁 Enhanced Arabic Excel blob created, size:', blob.size, 'bytes');
      
      if (blob.size === 0) {
        throw new Error('تم إنشاء ملف فارغ - يرجى المحاولة مرة أخرى');
      }
      
      if (blob.size < 100) {
        console.warn('⚠️ ملف صغير الحجم، ولكن قد يكون صحيحاً للتقارير الفارغة');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Enhanced Arabic filename with safe characters
      const now = new Date();
      const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const timeString = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
      const safeFilename = (filename || 'تقرير-HSA-شامل')
        .replace(/[^\u0600-\u06FF\w\s-]/g, '') // Keep Arabic, alphanumeric, spaces, hyphens
        .replace(/\s+/g, '-')
        .substring(0, 50); // Limit length
      a.download = `${safeFilename}-${timestamp}_${timeString}.xlsx`;
      
      // Add download attributes for better compatibility
      a.style.display = 'none';
      a.setAttribute('download', a.download);
      a.setAttribute('target', '_blank');
      
      document.body.appendChild(a);
      a.click();
      
      // Cleanup with delay for better browser compatibility
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log('✅ Enhanced Arabic Excel file downloaded successfully:', a.download);
      }, 100);
      
    } catch (blobError) {
      console.error('❌ Enhanced blob creation/download error:', blobError);
      throw new Error('فشل في تحميل ملف Excel المحسن - يرجى المحاولة مرة أخرى');
    }
    
  } catch (error) {
    console.error('❌ Excel export error:', error);
    
    // Enhanced error messages with detailed Arabic descriptions
    let errorMessage = 'فشل في تصدير ملف Excel المحسن';
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid sheet name')) {
        errorMessage = 'خطأ في أسماء أوراق العمل - يرجى المحاولة مرة أخرى';
      } else if (error.message.includes('out of memory')) {
        errorMessage = 'حجم البيانات كبير جداً - حاول تحديد فترة زمنية أقصر';
      } else if (error.message.includes('بيانات التقرير غير صحيحة')) {
        errorMessage = 'بيانات التقرير غير صحيحة أو فارغة - لا توجد بيانات للتصدير';
      } else if (error.message.includes('تم إنشاء ملف فارغ')) {
        errorMessage = 'تم إنشاء ملف فارغ - تأكد من وجود بيانات في الفترة المحددة';
      } else if (error.message.includes('فشل في إنشاء ملف Excel')) {
        errorMessage = 'فشل في إنشاء ملف Excel - مشكلة في معالجة البيانات';
      } else {
        errorMessage = `خطأ في تصدير Excel المحسن: ${error.message}`;
      }
    }
    
    throw new Error(errorMessage);
  }
}