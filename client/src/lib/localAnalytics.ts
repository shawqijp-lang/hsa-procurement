/**
 * 📊 نظام التحليلات المحلية السريعة
 * يوفر تحليلات فورية من البيانات المحفوظة في IndexedDB
 */

import { enhancedIndexedDB } from './enhancedIndexedDB';

interface AnalyticsResult {
  totalEvaluations: number;
  averageRating: number;
  completionRate: number;
  topPerformingLocations: LocationScore[];
  problematicTasks: TaskAnalysis[];
  dailyTrends: DailyTrend[];
  monthlyComparison: MonthlyData[];
}

interface LocationScore {
  locationId: number;
  locationName: string;
  averageScore: number;
  totalEvaluations: number;
}

interface TaskAnalysis {
  taskName: string;
  averageRating: number;
  completionRate: number;
  issueCount: number;
}

interface DailyTrend {
  date: string;
  evaluationCount: number;
  averageScore: number;
}

interface MonthlyData {
  month: string;
  totalEvaluations: number;
  averageScore: number;
  improvement: number;
}

export class LocalAnalytics {
  
  /**
   * 📈 تحليل شامل للبيانات المحلية
   */
  static async generateLocalAnalytics(): Promise<AnalyticsResult> {
    const startTime = performance.now();
    
    try {
      console.log('📊 [LocalAnalytics] بدء التحليل المحلي...');
      
      // جلب البيانات من IndexedDB
      const [evaluations, locations] = await Promise.all([
        this.getAllEvaluations(),
        this.getAllLocations()
      ]);
      
      if (evaluations.length === 0) {
        return this.getEmptyAnalytics();
      }
      
      // تحليلات متوازية
      const [
        basicStats,
        locationAnalysis,
        taskAnalysis,
        trendsAnalysis
      ] = await Promise.all([
        this.calculateBasicStats(evaluations),
        this.analyzeLocationPerformance(evaluations, locations),
        this.analyzeTaskPerformance(evaluations),
        this.analyzeTrends(evaluations)
      ]);
      
      const processingTime = performance.now() - startTime;
      console.log(`✅ [LocalAnalytics] التحليل مكتمل في ${processingTime.toFixed(2)}ms`);
      
      return {
        ...basicStats,
        topPerformingLocations: locationAnalysis,
        problematicTasks: taskAnalysis,
        dailyTrends: trendsAnalysis.daily,
        monthlyComparison: trendsAnalysis.monthly
      };
      
    } catch (error) {
      console.error('❌ [LocalAnalytics] خطأ في التحليل:', error);
      return this.getEmptyAnalytics();
    }
  }
  
  /**
   * 🎯 تحليل الأداء حسب الموقع
   */
  private static async analyzeLocationPerformance(
    evaluations: any[], 
    locations: any[]
  ): Promise<LocationScore[]> {
    const locationMap = new Map(locations.map(loc => [loc.id, loc.name]));
    const locationStats = new Map<number, { total: number; sum: number; count: number }>();
    
    evaluations.forEach(evaluation => {
      const locationId = evaluation.locationId;
      if (!locationStats.has(locationId)) {
        locationStats.set(locationId, { total: 0, sum: 0, count: 0 });
      }
      
      const stats = locationStats.get(locationId)!;
      const avgRating = this.calculateEvaluationAverage(evaluation);
      stats.sum += avgRating;
      stats.count += 1;
      stats.total += 1;
    });
    
    return Array.from(locationStats.entries())
      .map(([locationId, stats]) => ({
        locationId,
        locationName: locationMap.get(locationId) || `موقع ${locationId}`,
        averageScore: stats.sum / stats.count,
        totalEvaluations: stats.total
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10);
  }
  
  /**
   * 📋 تحليل أداء المهام
   */
  private static async analyzeTaskPerformance(evaluations: any[]): Promise<TaskAnalysis[]> {
    const taskStats = new Map<string, { ratings: number[]; completed: number; total: number }>();
    
    evaluations.forEach(evaluation => {
      evaluation.tasks?.forEach((task: any) => {
        const taskName = task.templateId?.toString() || 'مهمة غير معرفة';
        
        if (!taskStats.has(taskName)) {
          taskStats.set(taskName, { ratings: [], completed: 0, total: 0 });
        }
        
        const stats = taskStats.get(taskName)!;
        stats.total += 1;
        
        if (task.completed) {
          stats.completed += 1;
          stats.ratings.push(task.rating || 0);
        }
      });
    });
    
    return Array.from(taskStats.entries())
      .map(([taskName, stats]) => ({
        taskName,
        averageRating: stats.ratings.length > 0 
          ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length 
          : 0,
        completionRate: (stats.completed / stats.total) * 100,
        issueCount: stats.ratings.filter(r => r < 3).length
      }))
      .sort((a, b) => a.averageRating - b.averageRating)
      .slice(0, 10);
  }
  
  /**
   * 📅 تحليل الاتجاهات الزمنية
   */
  private static async analyzeTrends(evaluations: any[]): Promise<{
    daily: DailyTrend[];
    monthly: MonthlyData[];
  }> {
    // تجميع البيانات حسب التاريخ
    const dailyData = new Map<string, { count: number; totalScore: number }>();
    const monthlyData = new Map<string, { count: number; totalScore: number }>();
    
    evaluations.forEach(evaluation => {
      const date = evaluation.checklistDate || evaluation.createdAt;
      if (!date) return;
      
      const dayKey = date.split('T')[0]; // YYYY-MM-DD
      const monthKey = dayKey.substring(0, 7); // YYYY-MM
      
      const avgRating = this.calculateEvaluationAverage(evaluation);
      
      // البيانات اليومية
      if (!dailyData.has(dayKey)) {
        dailyData.set(dayKey, { count: 0, totalScore: 0 });
      }
      const dailyStats = dailyData.get(dayKey)!;
      dailyStats.count += 1;
      dailyStats.totalScore += avgRating;
      
      // البيانات الشهرية
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { count: 0, totalScore: 0 });
      }
      const monthlyStats = monthlyData.get(monthKey)!;
      monthlyStats.count += 1;
      monthlyStats.totalScore += avgRating;
    });
    
    // تحويل إلى مصفوفات مرتبة
    const daily = Array.from(dailyData.entries())
      .map(([date, stats]) => ({
        date,
        evaluationCount: stats.count,
        averageScore: stats.totalScore / stats.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // آخر 30 يوم
    
    const monthlyEntries = Array.from(monthlyData.entries())
      .map(([month, stats]) => ({
        month,
        totalEvaluations: stats.count,
        averageScore: stats.totalScore / stats.count,
        improvement: 0 // سيتم حسابه لاحقاً
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    // حساب التحسن الشهري
    for (let i = 1; i < monthlyEntries.length; i++) {
      const current = monthlyEntries[i];
      const previous = monthlyEntries[i - 1];
      current.improvement = ((current.averageScore - previous.averageScore) / previous.averageScore) * 100;
    }
    
    return { daily, monthly: monthlyEntries.slice(-12) }; // آخر 12 شهر
  }
  
  /**
   * 📊 حساب الإحصائيات الأساسية
   */
  private static async calculateBasicStats(evaluations: any[]): Promise<{
    totalEvaluations: number;
    averageRating: number;
    completionRate: number;
  }> {
    const totalEvaluations = evaluations.length;
    
    if (totalEvaluations === 0) {
      return { totalEvaluations: 0, averageRating: 0, completionRate: 0 };
    }
    
    let totalRating = 0;
    let completedTasks = 0;
    let totalTasks = 0;
    
    evaluations.forEach(evaluation => {
      totalRating += this.calculateEvaluationAverage(evaluation);
      
      evaluation.tasks?.forEach((task: any) => {
        totalTasks += 1;
        if (task.completed) completedTasks += 1;
      });
    });
    
    return {
      totalEvaluations,
      averageRating: totalRating / totalEvaluations,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    };
  }
  
  /**
   * 🔢 حساب متوسط تقييم واحد
   */
  private static calculateEvaluationAverage(evaluation: any): number {
    const tasks = evaluation.tasks || [];
    if (tasks.length === 0) return 0;
    
    const ratings = tasks
      .filter((task: any) => task.completed && typeof task.rating === 'number')
      .map((task: any) => task.rating);
    
    return ratings.length > 0 
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length 
      : 0;
  }
  
  /**
   * 📄 جلب جميع التقييمات
   */
  private static async getAllEvaluations(): Promise<any[]> {
    try {
      const evaluations = await enhancedIndexedDB.getData('unified_evaluations_v2') || [];
      return Array.isArray(evaluations) ? evaluations : [];
    } catch (error) {
      console.warn('⚠️ [LocalAnalytics] فشل جلب التقييمات:', error);
      return [];
    }
  }
  
  /**
   * 📍 جلب جميع المواقع
   */
  private static async getAllLocations(): Promise<any[]> {
    try {
      const locations = await enhancedIndexedDB.getData('dashboard_locations') || [];
      return Array.isArray(locations) ? locations : [];
    } catch (error) {
      console.warn('⚠️ [LocalAnalytics] فشل جلب المواقع:', error);
      return [];
    }
  }
  
  /**
   * 🏁 نتائج فارغة للحالات الاستثنائية
   */
  private static getEmptyAnalytics(): AnalyticsResult {
    return {
      totalEvaluations: 0,
      averageRating: 0,
      completionRate: 0,
      topPerformingLocations: [],
      problematicTasks: [],
      dailyTrends: [],
      monthlyComparison: []
    };
  }
}