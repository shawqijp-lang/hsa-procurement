import OpenAI from "openai";
import { db } from "./db";
import { dailyChecklists, checklistTemplates, locations, users, masterEvaluations } from "../shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

// الأحدث من OpenAI هو "gpt-4o" الذي تم إصداره في 13 مايو 2024. لا تغير هذا إلا إذا طلب المستخدم صراحة
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AnalysisData {
  evaluations: any[];
  locations: any[];
  users: any[];
  templates: any[];
}

export class AIAnalysisService {
  async getEvaluationData(startDate: string, endDate: string): Promise<AnalysisData> {
    console.log('🔍 Fetching evaluation data for AI analysis:', { startDate, endDate });
    
    try {
      // التأكد من صحة التواريخ
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('تنسيق التاريخ غير صحيح');
      }

      console.log('📅 Date range:', { start: start.toISOString(), end: end.toISOString() });

      // استعلام البيانات من النظام الموحد الجديد 🎯
      console.log('🎯 [AI Analysis] استخدام النظام الموحد master_evaluations');
      
      // تحويل التواريخ إلى strings للمقارنة مع evaluation_date (text field)
      const startDateStr = start.toISOString().split('T')[0]; // YYYY-MM-DD
      const endDateStr = end.toISOString().split('T')[0];     // YYYY-MM-DD
      
      const evaluationsData = await db
        .select()
        .from(masterEvaluations)
        .where(
          and(
            sql`${masterEvaluations.evaluationDate} >= ${startDateStr}`,
            sql`${masterEvaluations.evaluationDate} <= ${endDateStr}`
          )
        )
        .orderBy(desc(masterEvaluations.evaluationDate));

      const locationsData = await db.select().from(locations);
      const usersData = await db.select().from(users);
      const templatesData = await db.select().from(checklistTemplates);

      console.log(`📊 Found ${evaluationsData.length} evaluations for analysis`);
      console.log(`📍 Found ${locationsData.length} locations`);
      console.log(`👥 Found ${usersData.length} users`);

      return {
        evaluations: evaluationsData,
        locations: locationsData,
        users: usersData,
        templates: templatesData
      };
    } catch (error: any) {
      console.error('❌ Error fetching evaluation data:', error);
      throw new Error(`فشل في استخراج بيانات التقييمات: ${error.message}`);
    }
  }

  async analyzeEvaluations(data: AnalysisData): Promise<string> {
    console.log('🤖 Starting AI analysis of evaluation data...');
    console.log('📊 Data summary:', {
      evaluations: data.evaluations.length,
      locations: data.locations.length,
      users: data.users.length,
      templates: data.templates.length
    });
    
    if (data.evaluations.length === 0) {
      return `## تقرير التحليل الذكي

### لا توجد بيانات للتحليل

لم يتم العثور على أي تقييمات في الفترة المحددة. 

#### التوصيات:
- تأكد من وجود تقييمات مكتملة في الفترة الزمنية المحددة
- جرب توسيع النطاق الزمني للبحث
- تأكد من أن المستخدمين يقومون بحفظ التقييمات بشكل صحيح

#### خطوات مقترحة:
1. راجع صفحة التقييمات للتأكد من وجود بيانات
2. تحقق من إعدادات التواريخ في النظام
3. تواصل مع المستخدمين للتأكد من استخدام النظام`;
    }

    // تحضير البيانات للتحليل
    const analysisPrompt = this.prepareAnalysisPrompt(data);
    console.log('📝 Analysis prompt length:', analysisPrompt.length);
    
    try {
      // التحقق من مفتاح OpenAI
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('مفتاح OpenAI API غير متوفر');
      }

      console.log('🌐 Calling OpenAI API...');
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "أنت محلل بيانات خبير متخصص في تحليل أداء عمليات النظافة والصيانة. قدم تحليلاً شاملاً ومفصلاً باللغة العربية مع إحصائيات واضحة وتوصيات عملية."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        max_tokens: 2500,
        temperature: 0.7
      });

      const analysis = response.choices[0]?.message?.content;
      
      if (!analysis) {
        throw new Error('لم يتم الحصول على استجابة من خدمة التحليل');
      }

      console.log('✅ AI analysis completed successfully, length:', analysis.length);
      return analysis;

    } catch (error: any) {
      console.error('❌ OpenAI API error:', error);
      
      // معالجة تفصيلية للأخطاء
      if (error.code === 'invalid_api_key') {
        throw new Error('مفتاح OpenAI API غير صحيح');
      }
      
      if (error.code === 'rate_limit_exceeded') {
        throw new Error('تم تجاوز الحد المسموح لاستخدام API، يرجى المحاولة لاحقاً');
      }
      
      if (error.code === 'insufficient_quota') {
        throw new Error('انتهت حصة API المتاحة');
      }
      
      if (error.message?.includes('network') || error.code === 'ENOTFOUND') {
        throw new Error('خطأ في الاتصال بخدمة OpenAI');
      }
      
      throw new Error(`فشل في التحليل الذكي: ${error.message || 'خطأ غير معروف'}`);
    }
  }

  private safeParseJSON(jsonString: any): any[] {
    try {
      if (typeof jsonString === 'string') {
        const parsed = JSON.parse(jsonString);
        return Array.isArray(parsed) ? parsed : [];
      }
      return Array.isArray(jsonString) ? jsonString : [];
    } catch (error) {
      console.warn('Failed to parse JSON:', error);
      return [];
    }
  }

  private prepareAnalysisPrompt(data: AnalysisData): string {
    const { evaluations, locations, users, templates } = data;
    
    console.log('🔧 Preparing analysis prompt...');
    
    // إحصائيات أساسية
    const totalEvaluations = evaluations.length;
    const uniqueLocations = Array.from(new Set(evaluations.map(e => e.locationId))).length;
    const uniqueUsers = Array.from(new Set(evaluations.map(e => e.userId))).length;
    
    // حساب متوسط التقييمات مع معالجة آمنة
    let totalRatings = 0;
    let ratingCount = 0;
    let totalTasks = 0;
    let completedTasks = 0;

    for (const evaluation of evaluations) {
      const tasks = this.safeParseJSON(evaluation.tasks);
      
      for (const task of tasks) {
        if (task && typeof task === 'object') {
          totalTasks++;
          if (task.completed) {
            completedTasks++;
            if (task.rating && typeof task.rating === 'number') {
              totalRatings += task.rating;
              ratingCount++;
            }
          }
        }
      }
    }

    const overallAverage = ratingCount > 0 ? totalRatings / ratingCount : 0;
    const avgCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // إحصائيات المواقع - معالجة آمنة
    const locationStats: Array<{name: string, evaluations: number, avgCompletion: string}> = [];
    
    for (const location of locations) {
      const locationEvals = evaluations.filter(e => e.locationId === location.id);
      if (locationEvals.length > 0) {
        let locTotalTasks = 0;
        let locCompletedTasks = 0;
        
        for (const evaluation of locationEvals) {
          const tasks = this.safeParseJSON(evaluation.tasks);
          for (const task of tasks) {
            if (task && typeof task === 'object') {
              locTotalTasks++;
              if (task.completed) {
                locCompletedTasks++;
              }
            }
          }
        }
        
        const completion = locTotalTasks > 0 ? (locCompletedTasks / locTotalTasks) * 100 : 0;
        
        locationStats.push({
          name: location.nameAr || 'موقع غير محدد',
          evaluations: locationEvals.length,
          avgCompletion: completion.toFixed(1)
        });
      }
    }

    // إحصائيات المستخدمين
    const userStats = users.map(user => ({
      name: user.fullName || user.username || 'مستخدم غير محدد',
      evaluations: evaluations.filter(e => e.userId === user.id).length
    })).filter(stat => stat.evaluations > 0);

    const prompt = `
بيانات تقييمات نظام بيئة العمل للتحليل:

## الإحصائيات العامة:
- إجمالي التقييمات: ${totalEvaluations}
- عدد المواقع المفعلة: ${uniqueLocations}
- عدد المستخدمين النشطين: ${uniqueUsers}
- متوسط التقييم العام: ${overallAverage.toFixed(2)}/4
- متوسط نسبة الإكمال: ${avgCompletionRate.toFixed(1)}%

## إحصائيات المواقع:
${locationStats.map(loc => 
  `- ${loc.name}: ${loc.evaluations} تقييم، نسبة إكمال ${loc.avgCompletion}%`
).join('\n')}

## إحصائيات المستخدمين:
${userStats.map(user => 
  `- ${user.name}: ${user.evaluations} تقييم`
).join('\n')}

## عينة من التقييمات الأخيرة:
${evaluations.slice(0, 5).map(e => {
  const location = locations.find(l => l.id === e.locationId);
  const user = users.find(u => u.id === e.userId);
  const tasks = this.safeParseJSON(e.tasks);
  const completed = tasks.filter((t: any) => t && t.completed).length;
  
  const dateStr = e.checklistDate instanceof Date 
    ? e.checklistDate.toISOString().split('T')[0] 
    : String(e.checklistDate).split('T')[0];
  
  return `- ${location?.nameAr || 'موقع غير محدد'}: ${dateStr} - ${user?.fullName || 'مستخدم غير محدد'} - ${completed}/${tasks.length} مهام مكتملة - ملاحظات: ${e.evaluationNotes || 'لا توجد ملاحظات'}`;
}).join('\n')}

يرجى تحليل هذه البيانات وتقديم تقرير شامل ومفصل باللغة العربية.
`;

    return prompt;
  }

  async generateAnalysisHTML(analysis: string, startDate: string, endDate: string): Promise<string> {
    console.log('📄 Generating AI analysis HTML report...');
    
    const currentDate = new Date().toLocaleDateString('ar-EG', { calendar: 'gregory' });
    const reportId = `AI-ANALYSIS-${Date.now()}`;
    
    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير التحليل الذكي - نظام بيئة العمل</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', 'Amiri', 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif;
            line-height: 1.8;
            color: #333;
            background-color: #f8fafc;
            padding: 20px;
            direction: rtl;
        }
        
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .report-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
            position: relative;
        }
        
        .report-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }
        
        .ai-icon {
            font-size: 3em;
            margin-bottom: 20px;
            position: relative;
            z-index: 1;
        }
        
        .company-name {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            position: relative;
            z-index: 1;
        }
        
        .report-title {
            font-size: 2em;
            margin-bottom: 15px;
            position: relative;
            z-index: 1;
        }
        
        .report-period {
            font-size: 1.3em;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }
        
        .report-meta {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            padding: 25px;
            color: white;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .meta-item {
            background: rgba(255,255,255,0.2);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.3);
        }
        
        .meta-label {
            display: block;
            font-size: 0.9em;
            opacity: 0.9;
            margin-bottom: 8px;
        }
        
        .meta-value {
            display: block;
            font-size: 1.8em;
            font-weight: bold;
        }
        
        .analysis-content {
            padding: 40px;
            background: white;
        }
        
        .analysis-section {
            margin-bottom: 30px;
            padding: 25px;
            background: #f8fafc;
            border-radius: 12px;
            border-right: 5px solid #667eea;
        }
        
        .analysis-content h1,
        .analysis-content h2,
        .analysis-content h3 {
            color: #4c51bf;
            margin-bottom: 15px;
            font-weight: bold;
        }
        
        .analysis-content h1 {
            font-size: 1.8em;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        
        .analysis-content h2 {
            font-size: 1.5em;
            margin-top: 25px;
        }
        
        .analysis-content h3 {
            font-size: 1.3em;
            margin-top: 20px;
        }
        
        .analysis-content p {
            margin-bottom: 15px;
            line-height: 2;
            color: #4a5568;
        }
        
        .analysis-content ul,
        .analysis-content ol {
            margin: 15px 0;
            padding-right: 25px;
        }
        
        .analysis-content li {
            margin-bottom: 8px;
            line-height: 1.8;
            color: #4a5568;
        }
        
        .highlight {
            background: linear-gradient(120deg, #a8e6cf 0%, #dcedc8 100%);
            padding: 3px 8px;
            border-radius: 5px;
            font-weight: bold;
            color: #2d5016;
        }
        
        .insight-box {
            background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border-right: 5px solid #ff6b95;
        }
        
        .insight-box h4 {
            color: #ad1457;
            margin-bottom: 10px;
            font-size: 1.2em;
        }
        
        .recommendation-box {
            background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border-right: 5px solid #00b894;
        }
        
        .recommendation-box h4 {
            color: #00695c;
            margin-bottom: 10px;
            font-size: 1.2em;
        }
        
        .report-footer {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .ai-disclaimer {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 0.9em;
            opacity: 0.9;
        }
        
        @media print {
            body { 
                background: white !important; 
                padding: 0;
            }
            .report-container { 
                box-shadow: none !important; 
                border-radius: 0;
            }
            .analysis-section { 
                page-break-inside: avoid; 
            }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .analysis-section {
            animation: fadeIn 0.6s ease-out;
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <div class="ai-icon">🤖</div>
            <div class="company-name">HSA GROUP</div>
            <div class="report-title">تقرير التحليل الذكي لنظام بيئة العمل</div>
            <div class="report-period">الفترة: ${startDate} إلى ${endDate}</div>
        </div>
        
        <div class="report-meta">
            <div class="meta-item">
                <span class="meta-label">تاريخ التقرير</span>
                <span class="meta-value">${currentDate}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">رقم التقرير</span>
                <span class="meta-value">${reportId}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">نوع التحليل</span>
                <span class="meta-value">ذكي شامل</span>
            </div>
        </div>
        
        <div class="analysis-content">
            ${this.formatAnalysisContent(analysis)}
        </div>
        
        <div class="report-footer">
            <h3>تم إنتاج هذا التقرير بواسطة نظام HSA GROUP للتحليل الذكي</h3>
            <div class="ai-disclaimer">
                <strong>📊 تنويه:</strong> هذا التقرير تم إنتاجه باستخدام تقنيات الذكاء الاصطناعي المتقدمة لتحليل البيانات وتقديم رؤى شاملة حول أداء عمليات النظافة والصيانة. جميع التوصيات مبنية على تحليل البيانات الفعلية والأنماط المكتشفة.
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  private formatAnalysisContent(analysis: string): string {
    // تحويل النص إلى HTML منسق مع تحسينات التصميم
    let formattedContent = analysis;
    
    // تحويل العناوين
    formattedContent = formattedContent.replace(/##\s(.+)/g, '<h2>$1</h2>');
    formattedContent = formattedContent.replace(/###\s(.+)/g, '<h3>$1</h3>');
    formattedContent = formattedContent.replace(/####\s(.+)/g, '<h4>$1</h4>');
    
    // تحويل الفقرات
    formattedContent = formattedContent.replace(/\n\n/g, '</p><p>');
    formattedContent = '<p>' + formattedContent + '</p>';
    
    // تحويل القوائم
    formattedContent = formattedContent.replace(/\n- (.+)/g, '\n<li>$1</li>');
    formattedContent = formattedContent.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');
    
    // إضافة مربعات مميزة للرؤى والتوصيات
    formattedContent = formattedContent.replace(/(توصيات?.*?:)(.*?)(<\/p>)/g, 
      '<div class="recommendation-box"><h4>💡 $1</h4><p>$2</p></div>');
    
    formattedContent = formattedContent.replace(/(رؤي?ة?.*?:)(.*?)(<\/p>)/g, 
      '<div class="insight-box"><h4>🔍 $1</h4><p>$2</p></div>');
    
    // تمييز الأرقام والنسب المئوية
    formattedContent = formattedContent.replace(/(\d+\.?\d*%)/g, '<span class="highlight">$1</span>');
    formattedContent = formattedContent.replace(/(\d+\.?\d*)/g, '<span class="highlight">$1</span>');
    
    return formattedContent;
  }
}

// Export both class and instance for compatibility
export const aiAnalysisService = new AIAnalysisService();
export default AIAnalysisService;