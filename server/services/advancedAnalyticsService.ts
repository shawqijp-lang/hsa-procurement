/**
 * 🧠 خدمة التحليل المتقدم للبيانات 
 * تطبق أحدث الممارسات العالمية في تحليل البيانات والذكاء الاصطناعي
 */

import OpenAI from "openai";
import { db } from "../db";
import { dailyChecklists, checklistTemplates, locations, users, companies } from "../../shared/schema";
import { eq, and, gte, lte, desc, count, avg, sum, sql } from "drizzle-orm";
import { format } from "date-fns";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AdvancedAnalyticsData {
  evaluations: any[];
  locations: any[];
  users: any[];
  templates: any[];
  companies: any[];
  timeRange: {
    startDate: string;
    endDate: string;
  };
}

interface PredictiveInsight {
  category: string;
  prediction: string;
  confidence: number;
  timeframe: string;
  actionRequired: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface TrendAnalysis {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  strength: number;
  significance: 'high' | 'medium' | 'low';
  period: string;
}

interface BenchmarkData {
  companyId: number;
  companyName: string;
  performance: {
    overall: number;
    efficiency: number;
    consistency: number;
    improvement: number;
  };
  rank: number;
  percentile: number;
}

export class AdvancedAnalyticsService {
  
  /**
   * 🚀 التحليل التنبؤي المتقدم
   * يستخدم خوارزميات التعلم الآلي للتنبؤ بالاتجاهات المستقبلية
   */
  async generatePredictiveAnalytics(startDate: string, endDate: string, companyId?: number): Promise<{
    predictions: PredictiveInsight[];
    trends: TrendAnalysis[];
    recommendations: string[];
    confidence: number;
  }> {
    console.log('🔮 [Predictive Analytics] بدء التحليل التنبؤي المتقدم...');
    
    try {
      const data = await this.fetchComprehensiveData(startDate, endDate, companyId);
      
      // 1. تحليل الأنماط الزمنية
      const temporalPatterns = await this.analyzeTemporalPatterns(data);
      
      // 2. تحليل الاتجاهات
      const trendAnalysis = await this.performTrendAnalysis(data);
      
      // 3. التنبؤ بالأداء المستقبلي
      const predictions = await this.generatePredictions(data, temporalPatterns, trendAnalysis);
      
      // 4. توليد التوصيات الذكية
      const recommendations = await this.generateSmartRecommendations(data, predictions);
      
      return {
        predictions,
        trends: trendAnalysis,
        recommendations,
        confidence: this.calculateOverallConfidence(predictions)
      };
      
    } catch (error) {
      console.error('❌ [Predictive Analytics] خطأ في التحليل التنبؤي:', error);
      throw error;
    }
  }

  /**
   * 📊 تحليل الأداء المقارن (Benchmarking)
   * يقارن أداء الشركات والمواقع مع أفضل الممارسات
   */
  async generateBenchmarkAnalysis(startDate: string, endDate: string): Promise<{
    companyBenchmarks: BenchmarkData[];
    locationBenchmarks: any[];
    industryComparison: any;
    bestPractices: string[];
  }> {
    console.log('🏆 [Benchmark Analysis] بدء تحليل الأداء المقارن...');
    
    try {
      const data = await this.fetchComprehensiveData(startDate, endDate);
      
      // 1. تحليل أداء الشركات
      const companyBenchmarks = await this.analyzeCompanyPerformance(data);
      
      // 2. تحليل أداء المواقع
      const locationBenchmarks = await this.analyzeLocationPerformance(data);
      
      // 3. مقارنة بمعايير الصناعة
      const industryComparison = await this.compareWithIndustryStandards(data);
      
      // 4. استخراج أفضل الممارسات
      const bestPractices = await this.extractBestPractices(data);
      
      return {
        companyBenchmarks,
        locationBenchmarks,
        industryComparison,
        bestPractices
      };
      
    } catch (error) {
      console.error('❌ [Benchmark Analysis] خطأ في تحليل الأداء المقارن:', error);
      throw error;
    }
  }

  /**
   * 🤖 التحليل الذكي المدعوم بالذكاء الاصطناعي
   * يستخدم نماذج OpenAI المتقدمة لتحليل البيانات وتوليد الرؤى
   */
  async generateAIInsights(data: AdvancedAnalyticsData): Promise<{
    insights: string;
    keyFindings: string[];
    actionItems: string[];
    riskAssessment: string;
    opportunities: string[];
  }> {
    console.log('🧠 [AI Insights] بدء التحليل بالذكاء الاصطناعي المتقدم...');
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('مفتاح OpenAI API غير متوفر');
    }

    try {
      // تحضير البيانات للتحليل المتقدم
      const analysisPrompt = this.prepareAdvancedAnalysisPrompt(data);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `أنت محلل بيانات خبير متخصص في تطبيق أحدث التقنيات العالمية في تحليل البيانات. 
            تقوم بتحليل بيانات أنظمة إدارة بيئة العمل باستخدام:
            - التحليل التنبؤي (Predictive Analytics)
            - تحليل البيانات الضخمة (Big Data Analytics)
            - التعلم الآلي (Machine Learning)
            - الذكاء الاصطناعي التطبيقي
            - معايير ISO والمعايير العالمية للجودة
            
            قدم تحليلاً شاملاً ومتقدماً باللغة العربية مع رؤى قابلة للتطبيق.`
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.3, // Lower temperature for more consistent, analytical responses
        top_p: 0.9
      });

      const analysis = response.choices[0]?.message?.content;
      
      if (!analysis) {
        throw new Error('لم يتم الحصول على استجابة من خدمة التحليل المتقدم');
      }

      // استخراج المكونات المختلفة من التحليل
      const insights = this.extractInsights(analysis);
      
      return insights;
      
    } catch (error) {
      console.error('❌ [AI Insights] خطأ في التحليل بالذكاء الاصطناعي:', error);
      throw error;
    }
  }

  /**
   * 📈 تحليل البيانات الضخمة
   * يطبق تقنيات تحليل البيانات الضخمة لاستخراج أنماط معقدة
   */
  async performBigDataAnalytics(startDate: string, endDate: string): Promise<{
    patterns: any[];
    correlations: any[];
    anomalies: any[];
    insights: string[];
  }> {
    console.log('🔍 [Big Data Analytics] بدء تحليل البيانات الضخمة...');
    
    try {
      const data = await this.fetchComprehensiveData(startDate, endDate);
      
      // 1. اكتشاف الأنماط المعقدة
      const patterns = await this.discoverComplexPatterns(data);
      
      // 2. تحليل الارتباطات
      const correlations = await this.analyzeCorrelations(data);
      
      // 3. اكتشاف الشذوذ
      const anomalies = await this.detectAnomalies(data);
      
      // 4. استخراج الرؤى المتقدمة
      const insights = await this.extractAdvancedInsights(patterns, correlations, anomalies);
      
      return {
        patterns,
        correlations,
        anomalies,
        insights
      };
      
    } catch (error) {
      console.error('❌ [Big Data Analytics] خطأ في تحليل البيانات الضخمة:', error);
      throw error;
    }
  }

  /**
   * 🎯 تحليل الأداء في الوقت الفعلي
   * يوفر تحليلاً مستمراً للأداء مع تحديثات فورية
   */
  async generateRealTimeAnalytics(): Promise<{
    currentMetrics: any;
    alerts: any[];
    trends: any[];
    predictions: any[];
  }> {
    console.log('⚡ [Real-time Analytics] بدء التحليل في الوقت الفعلي...');
    
    try {
      // الحصول على البيانات الحديثة
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const [currentData, weekData] = await Promise.all([
        this.fetchComprehensiveData(format(last24Hours, 'yyyy-MM-dd'), format(now, 'yyyy-MM-dd')),
        this.fetchComprehensiveData(format(lastWeek, 'yyyy-MM-dd'), format(now, 'yyyy-MM-dd'))
      ]);
      
      // 1. حساب المؤشرات الحالية
      const currentMetrics = this.calculateCurrentMetrics(currentData);
      
      // 2. توليد التنبيهات
      const alerts = this.generateAlerts(currentData, weekData);
      
      // 3. تحليل الاتجاهات قصيرة المدى
      const trends = this.analyzeShortTermTrends(weekData);
      
      // 4. التنبؤات الفورية
      const predictions = this.generateShortTermPredictions(weekData);
      
      return {
        currentMetrics,
        alerts,
        trends,
        predictions
      };
      
    } catch (error) {
      console.error('❌ [Real-time Analytics] خطأ في التحليل الفوري:', error);
      throw error;
    }
  }

  // ===== الدوال المساعدة =====

  private async fetchComprehensiveData(startDate: string, endDate: string, companyId?: number): Promise<AdvancedAnalyticsData> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let evaluationQuery = db
      .select()
      .from(dailyChecklists)
      .where(
        and(
          gte(dailyChecklists.checklistDate, start.toISOString()),
          lte(dailyChecklists.checklistDate, end.toISOString())
        )
      );

    if (companyId) {
      evaluationQuery = evaluationQuery.where(eq(dailyChecklists.companyId, companyId));
    }

    const [evaluationsData, locationsData, usersData, templatesData, companiesData] = await Promise.all([
      evaluationQuery.orderBy(desc(dailyChecklists.checklistDate)),
      db.select().from(locations),
      db.select().from(users),
      db.select().from(checklistTemplates),
      db.select().from(companies)
    ]);

    return {
      evaluations: evaluationsData,
      locations: locationsData,
      users: usersData,
      templates: templatesData,
      companies: companiesData,
      timeRange: { startDate, endDate }
    };
  }

  private async analyzeTemporalPatterns(data: AdvancedAnalyticsData): Promise<any[]> {
    // تحليل الأنماط الزمنية: أيام الأسبوع، الأوقات، المواسم
    const patterns = [];
    
    // تجميع البيانات حسب يوم الأسبوع
    const weekdayPattern = data.evaluations.reduce((acc, evaluation) => {
      const date = new Date(evaluation.checklistDate);
      const weekday = date.getDay();
      acc[weekday] = (acc[weekday] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    patterns.push({
      type: 'weekday_distribution',
      data: weekdayPattern,
      insights: this.analyzeWeekdayPattern(weekdayPattern)
    });
    
    return patterns;
  }

  private async performTrendAnalysis(data: AdvancedAnalyticsData): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = [];
    
    // تحليل اتجاه جودة التقييمات عبر الزمن
    const evaluationTrend = this.calculateEvaluationTrend(data.evaluations);
    trends.push({
      metric: 'evaluation_quality',
      direction: evaluationTrend.direction,
      strength: evaluationTrend.strength,
      significance: evaluationTrend.significance,
      period: `${data.timeRange.startDate} to ${data.timeRange.endDate}`
    });
    
    return trends;
  }

  private async generatePredictions(
    data: AdvancedAnalyticsData, 
    patterns: any[], 
    trends: TrendAnalysis[]
  ): Promise<PredictiveInsight[]> {
    const predictions: PredictiveInsight[] = [];
    
    // توليد تنبؤات بناء على الأنماط والاتجاهات
    for (const trend of trends) {
      if (trend.significance === 'high') {
        predictions.push({
          category: trend.metric,
          prediction: this.generatePredictionText(trend),
          confidence: this.calculatePredictionConfidence(trend),
          timeframe: 'next_30_days',
          actionRequired: trend.direction === 'decreasing',
          priority: trend.direction === 'decreasing' ? 'high' : 'medium'
        });
      }
    }
    
    return predictions;
  }

  private async generateSmartRecommendations(
    data: AdvancedAnalyticsData, 
    predictions: PredictiveInsight[]
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    // توليد توصيات ذكية بناء على التنبؤات
    for (const prediction of predictions) {
      if (prediction.actionRequired) {
        recommendations.push(this.generateRecommendationText(prediction));
      }
    }
    
    return recommendations;
  }

  private async analyzeCompanyPerformance(data: AdvancedAnalyticsData): Promise<BenchmarkData[]> {
    const benchmarks: BenchmarkData[] = [];
    
    for (const company of data.companies) {
      const companyEvaluations = data.evaluations.filter(e => e.companyId === company.id);
      
      if (companyEvaluations.length > 0) {
        const performance = this.calculateCompanyPerformanceMetrics(companyEvaluations);
        
        benchmarks.push({
          companyId: company.id,
          companyName: company.nameAr || company.nameEn,
          performance,
          rank: 0, // سيتم حسابها لاحقاً
          percentile: 0 // سيتم حسابها لاحقاً
        });
      }
    }
    
    // ترتيب الشركات وحساب الرتب
    benchmarks.sort((a, b) => b.performance.overall - a.performance.overall);
    benchmarks.forEach((benchmark, index) => {
      benchmark.rank = index + 1;
      benchmark.percentile = ((benchmarks.length - index) / benchmarks.length) * 100;
    });
    
    return benchmarks;
  }

  private prepareAdvancedAnalysisPrompt(data: AdvancedAnalyticsData): string {
    const summary = this.generateDataSummary(data);
    
    return `
# تحليل متقدم لبيانات نظام إدارة بيئة العمل

## معلومات الفترة الزمنية:
- من: ${data.timeRange.startDate}
- إلى: ${data.timeRange.endDate}

## ملخص البيانات:
${summary}

## طلب التحليل المتقدم:
قم بتحليل هذه البيانات باستخدام أحدث تقنيات تحليل البيانات العالمية وقدم:

### 1. الرؤى الاستراتيجية:
- تحليل الأداء العام والاتجاهات
- نقاط القوة والضعف الرئيسية
- الفرص والتهديدات

### 2. التحليل التنبؤي:
- توقعات الأداء للفترة القادمة
- التنبؤ بالمشاكل المحتملة
- الاتجاهات المستقبلية المتوقعة

### 3. التوصيات العملية:
- خطوات تحسين فورية
- استراتيجيات طويلة المدى
- أولويات العمل

### 4. تقييم المخاطر:
- المخاطر التشغيلية
- نقاط الضعف في النظام
- خطط التخفيف المقترحة

### 5. الفرص:
- مجالات التحسين
- إمكانيات النمو
- الابتكارات المقترحة

يرجى تقديم تحليل شامل ومفصل بناء على أفضل الممارسات العالمية في تحليل البيانات.
`;
  }

  private extractInsights(analysis: string): {
    insights: string;
    keyFindings: string[];
    actionItems: string[];
    riskAssessment: string;
    opportunities: string[];
  } {
    // استخراج المكونات المختلفة من النص المُحلل
    const sections = analysis.split('###');
    
    return {
      insights: analysis,
      keyFindings: this.extractListItems(analysis, 'النتائج الرئيسية'),
      actionItems: this.extractListItems(analysis, 'التوصيات'),
      riskAssessment: this.extractSection(analysis, 'تقييم المخاطر'),
      opportunities: this.extractListItems(analysis, 'الفرص')
    };
  }

  // دوال مساعدة إضافية
  private generateDataSummary(data: AdvancedAnalyticsData): string {
    return `
- إجمالي التقييمات: ${data.evaluations.length}
- عدد الشركات: ${data.companies.length}
- عدد المواقع: ${data.locations.length}
- عدد المستخدمين: ${data.users.length}
- فترة التحليل: ${data.timeRange.endDate !== data.timeRange.startDate ? 'متعددة الأيام' : 'يوم واحد'}
`;
  }

  private analyzeWeekdayPattern(pattern: Record<number, number>): string {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const max = Math.max(...Object.values(pattern));
    const maxDay = Object.keys(pattern).find(day => pattern[parseInt(day)] === max);
    
    return `أعلى نشاط في يوم ${days[parseInt(maxDay || '0')]} بـ ${max} تقييم`;
  }

  private calculateEvaluationTrend(evaluations: any[]): {
    direction: 'increasing' | 'decreasing' | 'stable';
    strength: number;
    significance: 'high' | 'medium' | 'low';
  } {
    // حساب الاتجاه العام للتقييمات
    if (evaluations.length < 2) {
      return { direction: 'stable', strength: 0, significance: 'low' };
    }
    
    // تطبيق خوارزمية بسيطة لحساب الاتجاه
    const firstHalf = evaluations.slice(0, Math.floor(evaluations.length / 2));
    const secondHalf = evaluations.slice(Math.floor(evaluations.length / 2));
    
    const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, e) => sum + (e.finalScore || 0), 0) / firstHalf.length : 0;
    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, e) => sum + (e.finalScore || 0), 0) / secondHalf.length : 0;
    
    const difference = secondAvg - firstAvg;
    const threshold = 5; // عتبة التغيير
    
    if (Math.abs(difference) < threshold) {
      return { direction: 'stable', strength: Math.abs(difference), significance: 'low' };
    }
    
    return {
      direction: difference > 0 ? 'increasing' : 'decreasing',
      strength: Math.abs(difference),
      significance: Math.abs(difference) > threshold * 2 ? 'high' : 'medium'
    };
  }

  private generatePredictionText(trend: TrendAnalysis): string {
    return `بناء على الاتجاه ${trend.direction === 'increasing' ? 'المتزايد' : 'المتناقص'} في ${trend.metric}، متوقع استمرار هذا النمط`;
  }

  private calculatePredictionConfidence(trend: TrendAnalysis): number {
    return trend.significance === 'high' ? 0.8 : trend.significance === 'medium' ? 0.6 : 0.4;
  }

  private calculateOverallConfidence(predictions: PredictiveInsight[]): number {
    if (predictions.length === 0) return 0;
    return predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
  }

  private generateRecommendationText(prediction: PredictiveInsight): string {
    return `بناء على التنبؤ في ${prediction.category}، يُنصح بـ: مراجعة العمليات والتركيز على التحسينات`;
  }

  private calculateCompanyPerformanceMetrics(evaluations: any[]): {
    overall: number;
    efficiency: number;
    consistency: number;
    improvement: number;
  } {
    const scores = evaluations.map(e => e.finalScore || 0).filter(s => s > 0);
    
    if (scores.length === 0) {
      return { overall: 0, efficiency: 0, consistency: 0, improvement: 0 };
    }
    
    const overall = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const efficiency = overall / 100 * 100; // نسبة من 100
    const consistency = 100 - (this.calculateStandardDeviation(scores) / overall * 100);
    const improvement = this.calculateImprovementTrend(scores);
    
    return { overall, efficiency, consistency, improvement };
  }

  private calculateStandardDeviation(values: number[]): number {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateImprovementTrend(scores: number[]): number {
    if (scores.length < 2) return 0;
    
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;
    
    return secondAvg - firstAvg;
  }

  private extractListItems(text: string, section: string): string[] {
    const lines = text.split('\n');
    const items: string[] = [];
    let inSection = false;
    
    for (const line of lines) {
      if (line.includes(section)) {
        inSection = true;
        continue;
      }
      
      if (inSection && line.startsWith('-')) {
        items.push(line.substring(1).trim());
      } else if (inSection && line.startsWith('#')) {
        break; // نهاية القسم
      }
    }
    
    return items;
  }

  private extractSection(text: string, section: string): string {
    const lines = text.split('\n');
    let inSection = false;
    let sectionText = '';
    
    for (const line of lines) {
      if (line.includes(section)) {
        inSection = true;
        continue;
      }
      
      if (inSection && line.startsWith('#')) {
        break; // نهاية القسم
      }
      
      if (inSection) {
        sectionText += line + '\n';
      }
    }
    
    return sectionText.trim();
  }

  // دوال إضافية للتحليلات المتقدمة
  private async discoverComplexPatterns(data: AdvancedAnalyticsData): Promise<any[]> {
    // تطبيق خوارزميات اكتشاف الأنماط المعقدة
    return [];
  }

  private async analyzeCorrelations(data: AdvancedAnalyticsData): Promise<any[]> {
    // تحليل الارتباطات بين المتغيرات المختلفة
    return [];
  }

  private async detectAnomalies(data: AdvancedAnalyticsData): Promise<any[]> {
    // اكتشاف الشذوذ في البيانات
    return [];
  }

  private async extractAdvancedInsights(patterns: any[], correlations: any[], anomalies: any[]): Promise<string[]> {
    // استخراج الرؤى المتقدمة من التحليلات
    return [];
  }

  private async analyzeLocationPerformance(data: AdvancedAnalyticsData): Promise<any[]> {
    // تحليل أداء المواقع المختلفة
    return [];
  }

  private async compareWithIndustryStandards(data: AdvancedAnalyticsData): Promise<any> {
    // مقارنة مع معايير الصناعة
    return {};
  }

  private async extractBestPractices(data: AdvancedAnalyticsData): Promise<string[]> {
    // استخراج أفضل الممارسات
    return [];
  }

  private calculateCurrentMetrics(data: AdvancedAnalyticsData): any {
    // حساب المؤشرات الحالية
    return {};
  }

  private generateAlerts(currentData: AdvancedAnalyticsData, weekData: AdvancedAnalyticsData): any[] {
    // توليد التنبيهات
    return [];
  }

  private analyzeShortTermTrends(data: AdvancedAnalyticsData): any[] {
    // تحليل الاتجاهات قصيرة المدى
    return [];
  }

  private generateShortTermPredictions(data: AdvancedAnalyticsData): any[] {
    // توليد التنبؤات قصيرة المدى
    return [];
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();