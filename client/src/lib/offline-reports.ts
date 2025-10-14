// نظام التقارير للعمل في وضع عدم الاتصال
// يدعم إنشاء التقارير من البيانات المحفوظة محلياً

// import { DirectLocalSave } from './directLocalSave';
import { formatReportDateTime } from './date-utils';

// استبدال استيراد DirectLocalSave مؤقتاً
const DirectLocalSave = {
  getAllEvaluations: () => []
};

// تعريف أنواع البيانات المحلية
interface DirectSaveEvaluation {
  id: string;
  locationId: number;
  userId: number;
  evaluationDate: string;
  finalScore?: number;
  tasks: Array<{
    templateId: number;
    rating: number;
    notes?: string;
    itemComment?: string;
    subTaskRatings: any[];
  }>;
  timestamp: number;
  synced: boolean;
  saved_method: 'direct_local_save';
}

export interface OfflineReportData {
  period: string;
  generatedAt: string;
  totalEvaluations: number;
  locations: OfflineLocationReport[];
  source: 'offline';
}

export interface OfflineLocationReport {
  id: string;
  name: string;
  evaluations: DirectSaveEvaluation[];
  averageRating: number;
  completionRate: number;
}

/**
 * إنشاء تقرير من البيانات المحفوظة محلياً
 */
export function generateOfflineReport(startDate: string, endDate: string): OfflineReportData {
  try {
    console.log('📊 [OfflineReports] إنشاء تقرير من البيانات المحلية...');
    
    const allEvaluations = DirectLocalSave.getAllEvaluations();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // تصفية التقييمات حسب الفترة الزمنية
    const filteredEvaluations = allEvaluations.filter((evaluation: any) => {
      const evalDate = new Date(evaluation.evaluationDate);
      return evalDate >= start && evalDate <= end;
    });
    
    console.log(`📋 [OfflineReports] تم العثور على ${filteredEvaluations.length} تقييم في الفترة المحددة`);
    
    // تجميع التقييمات حسب الموقع
    const locationGroups = filteredEvaluations.reduce((acc: Record<string, any>, evaluation: any) => {
      const locationKey = `${evaluation.locationId}`;
      if (!acc[locationKey]) {
        acc[locationKey] = [];
      }
      acc[locationKey].push(evaluation);
      return acc;
    }, {} as Record<string, DirectSaveEvaluation[]>);
    
    // إنشاء تقارير المواقع
    const locations: OfflineLocationReport[] = Object.entries(locationGroups).map(([locationId, evaluations]) => {
      const evalArray = evaluations as any[];
      const totalRating = evalArray.reduce((sum: any, evalItem: any) => sum + (evalItem.finalScore || 0), 0);
      const averageRating = evalArray.length > 0 ? totalRating / evalArray.length / 25 : 0; // تحويل من 100 إلى 4 (100/25 = 4)
      
      const totalTasks = evalArray.reduce((sum: any, evalItem: any) => sum + evalItem.tasks.length, 0);
      const completedTasks = evalArray.reduce((sum: any, evalItem: any) => 
        sum + evalItem.tasks.filter((task: any) => task.rating > 0).length, 0
      );
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      return {
        id: locationId,
        name: `موقع ${locationId}`, // يمكن تحسينه للحصول على الاسم الفعلي
        evaluations: evalArray,
        averageRating: Math.round(averageRating * 10) / 10,
        completionRate: Math.round(completionRate)
      };
    });
    
    const reportData: OfflineReportData = {
      period: `${startDate} إلى ${endDate}`,
      generatedAt: formatReportDateTime(),
      totalEvaluations: filteredEvaluations.length,
      locations,
      source: 'offline'
    };
    
    console.log('✅ [OfflineReports] تم إنشاء التقرير بنجاح:', reportData);
    return reportData;
    
  } catch (error) {
    console.error('❌ [OfflineReports] خطأ في إنشاء التقرير:', error);
    throw new Error('فشل في إنشاء التقرير من البيانات المحلية');
  }
}

/**
 * فحص توفر البيانات للفترة المحددة
 */
export function checkOfflineDataAvailability(startDate: string, endDate: string): {
  available: boolean;
  count: number;
  dateRange: string;
} {
  try {
    const allEvaluations = DirectLocalSave.getAllEvaluations();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const availableEvaluations = allEvaluations.filter((evaluation: any) => {
      const evalDate = new Date(evaluation.evaluationDate);
      return evalDate >= start && evalDate <= end;
    });
    
    return {
      available: availableEvaluations.length > 0,
      count: availableEvaluations.length,
      dateRange: `${startDate} - ${endDate}`
    };
  } catch (error) {
    console.error('❌ [OfflineReports] خطأ في فحص البيانات:', error);
    return {
      available: false,
      count: 0,
      dateRange: `${startDate} - ${endDate}`
    };
  }
}