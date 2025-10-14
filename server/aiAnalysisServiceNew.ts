import OpenAI from "openai";
import { db } from "./db";
import { dailyChecklists, locations, users, checklistTemplates } from "@shared/schema";
import { and, gte, lte, desc } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AnalysisData {
  evaluations: any[];
  locations: any[];
  users: any[];
  templates: any[];
}

export class AIAnalysisServiceNew {
  async generateAnalysis(startDate: string, endDate: string): Promise<string> {
    try {
      console.log('🔍 Fetching data for AI analysis:', { startDate, endDate });
      
      // جلب البيانات
      const data = await this.fetchData(startDate, endDate);
      
      if (data.evaluations.length === 0) {
        console.log('⚠️ No evaluations found, generating fallback report with available data');
        return this.generateFallbackReport(data, startDate, endDate);
      }
      
      // تحضير النص للتحليل
      const analysisText = this.prepareAnalysisText(data);
      
      // إرسال للذكاء الاصطناعي
      const aiResponse = await this.callOpenAI(analysisText);
      
      // إنتاج HTML
      return this.generateHTML(aiResponse, startDate, endDate);
      
    } catch (error: any) {
      console.error('❌ AI Analysis failed:', error);
      throw new Error(`فشل في التحليل الذكي: ${error.message}`);
    }
  }

  private async fetchData(startDate: string, endDate: string): Promise<AnalysisData> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    console.log('🔍 Date range for AI analysis:', { 
      startDate, 
      endDate, 
      startParsed: start.toISOString(), 
      endParsed: end.toISOString() 
    });
    
    const [evaluationsData, locationsData, usersData, templatesData] = await Promise.all([
      db.select().from(dailyChecklists)
        .where(and(
          gte(dailyChecklists.checklistDate, start),
          lte(dailyChecklists.checklistDate, end)
        ))
        .orderBy(desc(dailyChecklists.checklistDate)),
      db.select().from(locations),
      db.select().from(users),
      db.select().from(checklistTemplates)
    ]);

    console.log('📊 Data fetched for AI analysis:', {
      evaluations: evaluationsData.length,
      locations: locationsData.length,
      users: usersData.length,
      templates: templatesData.length,
      dateRange: `${startDate} to ${endDate}`
    });

    // إذا لم يتم العثور على تقييمات، جرب البحث بدون قيود التاريخ لفهم السبب
    if (evaluationsData.length === 0) {
      console.log('⚠️ No evaluations found in date range, checking all evaluations...');
      const allEvaluations = await db.select().from(dailyChecklists).limit(5);
      console.log('📋 Sample of all evaluations:', allEvaluations.map(e => ({
        id: e.id,
        date: e.checklistDate,
        locationId: e.locationId,
        userId: e.userId
      })));
    }

    return {
      evaluations: evaluationsData,
      locations: locationsData,
      users: usersData,
      templates: templatesData
    };
  }

  private prepareAnalysisText(data: AnalysisData): string {
    const { evaluations, locations, users } = data;
    
    let text = `تحليل أداء النظافة والصيانة\n\n`;
    text += `إجمالي التقييمات: ${evaluations.length}\n`;
    text += `عدد المواقع: ${Array.from(new Set(evaluations.map(e => e.locationId))).length}\n`;
    text += `عدد المستخدمين: ${Array.from(new Set(evaluations.map(e => e.userId))).length}\n\n`;

    // تحليل بسيط للبيانات
    let totalCompleted = 0;
    let totalTasks = 0;
    let totalRating = 0;
    let ratingCount = 0;

    for (const evaluation of evaluations) {
      try {
        let tasks = [];
        if (typeof evaluation.tasks === 'string') {
          tasks = JSON.parse(evaluation.tasks);
        } else if (Array.isArray(evaluation.tasks)) {
          tasks = evaluation.tasks;
        }

        for (const task of tasks) {
          if (task && typeof task === 'object') {
            totalTasks++;
            if (task.completed) {
              totalCompleted++;
              if (task.rating && typeof task.rating === 'number') {
                totalRating += task.rating;
                ratingCount++;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to parse tasks for evaluation:', evaluation.id);
      }
    }

    const completionRate = totalTasks > 0 ? (totalCompleted / totalTasks * 100).toFixed(1) : '0';
    const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : '0';

    text += `معدل الإكمال: ${completionRate}%\n`;
    text += `متوسط التقييم: ${avgRating}/4\n\n`;

    // إضافة عينة من التقييمات
    text += `عينة من التقييمات:\n`;
    for (const evaluation of evaluations.slice(0, 3)) {
      const location = locations.find(l => l.id === evaluation.locationId);
      const user = users.find(u => u.id === evaluation.userId);
      const date = evaluation.checklistDate instanceof Date 
        ? evaluation.checklistDate.toISOString().split('T')[0]
        : evaluation.checklistDate.toString().split('T')[0];
      
      text += `- ${location?.nameAr || 'موقع غير محدد'} - ${date} - ${user?.fullName || 'مستخدم غير محدد'}\n`;
      if (evaluation.evaluationNotes) {
        text += `  ملاحظات: ${evaluation.evaluationNotes}\n`;
      }
    }

    return text;
  }

  private async callOpenAI(analysisText: string): Promise<string> {
    console.log('🤖 Calling OpenAI API...');
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "أنت محلل بيانات خبير متخصص في تحليل أداء عمليات النظافة والصيانة. قدم تحليلاً شاملاً ومفصلاً باللغة العربية مع توصيات عملية."
          },
          {
            role: "user",
            content: `قم بتحليل البيانات التالية وقدم تقريراً شاملاً يتضمن نقاط القوة والضعف والتوصيات:\n\n${analysisText}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        throw new Error('لم يتم الحصول على استجابة من خدمة التحليل');
      }

      console.log('✅ OpenAI analysis completed');
      return analysis;
      
    } catch (error: any) {
      console.log('⚠️ OpenAI API unavailable, generating fallback analysis...');
      // إنتاج تحليل بديل في حالة عدم توفر API
      return this.generateFallbackAnalysis(analysisText);
    }
  }

  private generateFallbackAnalysis(analysisText: string): string {
    const lines = analysisText.split('\n').filter(line => line.trim());
    
    let analysis = `## تقرير التحليل الإحصائي المفصل\n\n`;
    
    // استخراج البيانات من النص
    const totalEvals = lines.find(l => l.includes('إجمالي التقييمات:'))?.split(':')[1]?.trim() || '0';
    const locations = lines.find(l => l.includes('عدد المواقع:'))?.split(':')[1]?.trim() || '0';
    const users = lines.find(l => l.includes('عدد المستخدمين:'))?.split(':')[1]?.trim() || '0';
    const completion = lines.find(l => l.includes('معدل الإكمال:'))?.split(':')[1]?.trim() || '0%';
    const rating = lines.find(l => l.includes('متوسط التقييم:'))?.split(':')[1]?.trim() || '0/4';
    
    analysis += `### الملخص التنفيذي:\n`;
    analysis += `تم تحليل **${totalEvals}** تقييماً عبر **${locations}** مواقع بواسطة **${users}** مستخدم.\n\n`;
    
    analysis += `### المؤشرات الرئيسية:\n`;
    analysis += `📊 **معدل الإكمال العام:** ${completion}\n`;
    analysis += `⭐ **متوسط التقييم:** ${rating}\n`;
    analysis += `📍 **المواقع المشمولة:** ${locations} موقع\n`;
    analysis += `👥 **عدد المقيّمين:** ${users} مستخدم\n\n`;
    
    // تحليل الأداء
    const completionValue = parseFloat(completion.replace('%', ''));
    const ratingValue = parseFloat(rating.split('/')[0]);
    
    analysis += `### تحليل الأداء:\n`;
    
    if (completionValue >= 90) {
      analysis += `✅ **أداء ممتاز:** معدل الإكمال مرتفع جداً (${completion})\n`;
    } else if (completionValue >= 75) {
      analysis += `📈 **أداء جيد:** معدل الإكمال مقبول (${completion}) مع إمكانية للتحسين\n`;
    } else {
      analysis += `⚠️ **يحتاج تحسين:** معدل الإكمال منخفض (${completion})\n`;
    }
    
    if (ratingValue >= 3.5) {
      analysis += `⭐ **جودة عالية:** متوسط التقييم ممتاز (${rating})\n`;
    } else if (ratingValue >= 2.5) {
      analysis += `📊 **جودة متوسطة:** متوسط التقييم مقبول (${rating})\n`;
    } else {
      analysis += `🔍 **يحتاج مراجعة:** متوسط التقييم منخفض (${rating})\n`;
    }
    
    analysis += `\n### التوصيات:\n`;
    analysis += `1. **مراقبة الأداء:** متابعة دورية لمعدلات الإكمال والتقييم\n`;
    analysis += `2. **تدريب الفرق:** تطوير برامج تدريبية للمناطق ذات الأداء المنخفض\n`;
    analysis += `3. **تحسين العمليات:** مراجعة إجراءات النظافة في المواقع\n`;
    analysis += `4. **التشجيع والحوافز:** وضع نظام مكافآت للأداء المتميز\n`;
    analysis += `5. **التقييم المستمر:** جدولة تقييمات منتظمة لضمان الجودة\n\n`;
    
    analysis += `### الخطوات التالية:\n`;
    analysis += `- مراجعة التقييمات المنخفضة وتحديد أسباب المشاكل\n`;
    analysis += `- وضع خطة تحسين مع جدول زمني واضح\n`;
    analysis += `- تطوير معايير جودة موحدة لجميع المواقع\n`;
    analysis += `- إجراء مراجعة شهرية للتقدم المحرز\n\n`;
    
    analysis += `*تم إنتاج هذا التقرير بواسطة نظام التحليل الإحصائي المدمج*`;
    
    return analysis;
  }

  private async generateHTML(analysis: string, startDate: string, endDate: string): Promise<string> {
    // جلب البيانات للرسومات البيانية
    const chartData = await this.getChartData(startDate, endDate);
    
    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير التحليل الذكي - ${startDate} إلى ${endDate}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', 'IBM Plex Sans Arabic', Arial, sans-serif;
            line-height: 1.6;
            color: #2d3748;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .main-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .header h1 {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 15px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .period-badge {
            background: rgba(255,255,255,0.2);
            padding: 15px 30px;
            border-radius: 50px;
            display: inline-block;
            font-size: 1.2rem;
            font-weight: 500;
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
            margin-bottom: 40px;
        }
        
        .metric-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border-top: 5px solid #fbbf24;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }
        
        .metric-icon {
            font-size: 3rem;
            margin-bottom: 15px;
            color: #f59e0b;
        }
        
        .metric-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 8px;
        }
        
        .metric-label {
            font-size: 1.1rem;
            color: #4a5568;
            font-weight: 500;
        }
        
        .chart-container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        
        .chart-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .chart-wrapper {
            position: relative;
            height: 400px;
            margin-bottom: 20px;
        }
        
        .analysis-section {
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .analysis-content {
            font-size: 1.1rem;
            line-height: 1.8;
            color: #4a5568;
        }
        
        .analysis-content h2 {
            color: #f59e0b;
            font-size: 1.8rem;
            margin: 30px 0 15px 0;
            border-bottom: 2px solid #fbbf24;
            padding-bottom: 10px;
        }
        
        .analysis-content h3 {
            color: #d97706;
            font-size: 1.4rem;
            margin: 25px 0 10px 0;
        }
        
        .footer {
            text-align: center;
            padding: 30px;
            background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
            color: white;
            border-radius: 15px;
            margin-top: 40px;
        }
        
        .footer-logo {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .progress-ring {
            width: 120px;
            height: 120px;
            margin: 0 auto 20px;
        }
        
        @media print {
            body { background: white; }
            .header { background: #f59e0b !important; }
            .chart-wrapper { height: 300px; }
        }
        
        @media (max-width: 768px) {
            .header h1 { font-size: 2rem; }
            .dashboard-grid { grid-template-columns: 1fr; }
            .main-container { padding: 10px; }
        }
    </style>
</head>
<body>
    <div class="main-container">
        <!-- Header Section -->
        <div class="header">
            <h1>🎯 تقرير التحليل الذكي المتقدم</h1>
            <div class="period-badge">
                📅 فترة التحليل: ${startDate} → ${endDate}
            </div>
        </div>

        <!-- Metrics Dashboard -->
        <div class="dashboard-grid">
            <div class="metric-card">
                <div class="metric-icon">📊</div>
                <div class="metric-value">${chartData.totalEvaluations}</div>
                <div class="metric-label">إجمالي التقييمات</div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">📍</div>
                <div class="metric-value">${chartData.totalLocations}</div>
                <div class="metric-label">المواقع المشمولة</div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">👥</div>
                <div class="metric-value">${chartData.totalUsers}</div>
                <div class="metric-label">عدد المقيّمين</div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">⭐</div>
                <div class="metric-value">${chartData.averageRating.toFixed(1)}</div>
                <div class="metric-label">متوسط التقييم (من 4)</div>
            </div>
        </div>

        <!-- Completion Rate Chart -->
        <div class="chart-container">
            <h3 class="chart-title">📈 معدل الإكمال عبر الوقت</h3>
            <div class="chart-wrapper">
                <canvas id="completionChart"></canvas>
            </div>
        </div>

        <!-- Ratings Distribution Chart -->
        <div class="chart-container">
            <h3 class="chart-title">⭐ توزيع التقييمات</h3>
            <div class="chart-wrapper">
                <canvas id="ratingsChart"></canvas>
            </div>
        </div>

        <!-- Location Performance Chart -->
        <div class="chart-container">
            <h3 class="chart-title">🏢 أداء المواقع</h3>
            <div class="chart-wrapper">
                <canvas id="locationChart"></canvas>
            </div>
        </div>

        <!-- AI Analysis Section -->
        <div class="analysis-section">
            <h2 style="text-align: center; color: #f59e0b; margin-bottom: 30px;">🤖 التحليل الذكي المفصل</h2>
            <div class="analysis-content">${this.formatAnalysisContent(analysis)}</div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-logo">HSA GROUP</div>
            <div>نظام بيئة العمل والصيانة المتقدم</div>
            <div style="margin-top: 10px; font-size: 0.9rem; opacity: 0.8;">
                تم إنتاج هذا التقرير بواسطة الذكاء الاصطناعي • ${new Date().toLocaleDateString('ar-EG', { calendar: 'gregory' })}
            </div>
        </div>
    </div>

    <script>
        // Chart.js Configuration
        Chart.defaults.font.family = 'Segoe UI, IBM Plex Sans Arabic, Arial, sans-serif';
        Chart.defaults.color = '#4a5568';
        
        const chartData = ${JSON.stringify(chartData)};
        
        // Completion Rate Over Time Chart
        const completionCtx = document.getElementById('completionChart').getContext('2d');
        new Chart(completionCtx, {
            type: 'line',
            data: {
                labels: chartData.dates,
                datasets: [{
                    label: 'معدل الإكمال (%)',
                    data: chartData.completionRates,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                }
            }
        });

        // Ratings Distribution Pie Chart
        const ratingsCtx = document.getElementById('ratingsChart').getContext('2d');
        new Chart(ratingsCtx, {
            type: 'doughnut',
            data: {
                labels: ['ممتاز (4)', 'جيد (3)', 'مقبول (2)', 'ضعيف (1)'],
                datasets: [{
                    data: chartData.ratingsDistribution,
                    backgroundColor: [
                        '#10b981',
                        '#f59e0b', 
                        '#ef4444',
                        '#6b7280'
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });

        // Location Performance Bar Chart
        const locationCtx = document.getElementById('locationChart').getContext('2d');
        new Chart(locationCtx, {
            type: 'bar',
            data: {
                labels: chartData.locationNames,
                datasets: [{
                    label: 'معدل الإكمال (%)',
                    data: chartData.locationCompletionRates,
                    backgroundColor: 'rgba(245, 158, 11, 0.8)',
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;
  }

  private generateEmptyReport(): string {
    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>تقرير التحليل الذكي - لا توجد بيانات</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .message { background: #fef3c7; padding: 20px; border-radius: 10px; }
    </style>
</head>
<body>
    <div class="message">
        <h2>لا توجد بيانات للتحليل</h2>
        <p>لم يتم العثور على أي تقييمات في الفترة المحددة.</p>
    </div>
</body>
</html>`;
  }

  private async generateFallbackReport(data: AnalysisData, startDate: string, endDate: string): Promise<string> {
    console.log('🔄 Generating fallback report with system overview');
    
    // جلب جميع التقييمات بدون قيود تاريخية
    const allEvaluations = await db.select().from(dailyChecklists).orderBy(desc(dailyChecklists.checklistDate));
    
    const { locations, users, templates } = data;
    
    const currentDate = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      calendar: 'gregory' // التقويم الميلادي
    });

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير التحليل الذكي - نظرة عامة على النظام</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            direction: rtl;
            text-align: right;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            border-radius: 10px;
            color: white;
        }
        
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .metric-card {
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            padding: 25px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
        }
        
        .metric-value {
            font-size: 3em;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 10px;
        }
        
        .metric-label {
            font-size: 1.2em;
            color: #555;
        }
        
        .recent-activity {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        
        .activity-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            margin-bottom: 10px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .warning-box {
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            border: 2px solid #f1c40f;
            padding: 25px;
            border-radius: 10px;
            margin: 30px 0;
            text-align: center;
        }
        
        .warning-box h3 {
            color: #d68910;
            margin-bottom: 15px;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 تقرير التحليل الذكي للنظام</h1>
            <p>نظرة شاملة على نظام بيئة العمل - HSA GROUP</p>
            <div style="margin-top: 20px;">
                <strong>الفترة المطلوبة:</strong> ${startDate} إلى ${endDate}
            </div>
        </div>

        <div class="warning-box">
            <h3>⚠️ تنبيه</h3>
            <p>لم يتم العثور على تقييمات في الفترة المحددة (${startDate} إلى ${endDate})</p>
            <p>يعرض هذا التقرير نظرة عامة على النظام والبيانات المتوفرة</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${locations.length}</div>
                <div class="metric-label">إجمالي المواقع</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value">${users.length}</div>
                <div class="metric-label">المستخدمين المسجلين</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value">${templates.length}</div>
                <div class="metric-label">قوالب المهام</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value">${allEvaluations.length}</div>
                <div class="metric-label">إجمالي التقييمات</div>
            </div>
        </div>

        <div class="recent-activity">
            <h3>📋 أحدث التقييمات في النظام</h3>
            ${allEvaluations.slice(0, 5).map(evaluation => {
              const location = locations.find(l => l.id === evaluation.locationId);
              const user = users.find(u => u.id === evaluation.userId);
              const date = evaluation.checklistDate instanceof Date 
                ? evaluation.checklistDate.toLocaleDateString('ar-EG')
                : new Date(evaluation.checklistDate).toLocaleDateString('ar-EG');
              
              return `
                <div class="activity-item">
                    <div>
                        <strong>${location?.nameAr || 'موقع غير محدد'}</strong>
                        <br>
                        <small>بواسطة: ${user?.fullName || 'مستخدم غير محدد'}</small>
                    </div>
                    <div style="text-align: left;">
                        <strong>${date}</strong>
                    </div>
                </div>
              `;
            }).join('')}
        </div>

        <div class="recent-activity">
            <h3>🏢 المواقع المتاحة</h3>
            ${locations.map(location => `
              <div class="activity-item">
                <div>
                    <strong>${location.nameAr}</strong>
                    <br>
                    <small>${location.nameEn}</small>
                </div>
                <div>
                    <span style="font-size: 1.5em;">${location.icon === 'building' ? '🏢' : location.icon === 'home' ? '🏠' : location.icon === 'droplets' ? '🚿' : '📍'}</span>
                </div>
              </div>
            `).join('')}
        </div>

        <div class="footer">
            <h3>💡 توصيات للحصول على تحليل شامل</h3>
            <p>• تأكد من وجود تقييمات في الفترة الزمنية المحددة</p>
            <p>• جرب توسيع النطاق الزمني للبحث</p>
            <p>• تأكد من قيام المستخدمين بحفظ التقييمات بشكل صحيح</p>
            <br>
            <p><strong>تاريخ التقرير:</strong> ${currentDate}</p>
            <p><strong>نظام HSA GROUP لإدارة النظافة</strong></p>
        </div>
    </div>
</body>
</html>`;
  }

  private async getChartData(startDate: string, endDate: string): Promise<any> {
    try {
      const data = await this.fetchData(startDate, endDate);
      const { evaluations, locations, users } = data;

      // حساب الإحصائيات الأساسية
      let totalCompleted = 0;
      let totalTasks = 0;
      let totalRating = 0;
      let ratingCount = 0;
      const ratingsDistribution = [0, 0, 0, 0]; // للتقييمات 4,3,2,1
      const dailyData = new Map();
      const locationPerformance = new Map();

      // معالجة البيانات
      for (const evaluation of evaluations) {
        const date = evaluation.checklistDate instanceof Date 
          ? evaluation.checklistDate.toISOString().split('T')[0]
          : evaluation.checklistDate.toString().split('T')[0];

        let tasks = [];
        try {
          if (typeof evaluation.tasks === 'string') {
            tasks = JSON.parse(evaluation.tasks);
          } else if (Array.isArray(evaluation.tasks)) {
            tasks = evaluation.tasks;
          }
        } catch (err) {
          console.warn('Failed to parse tasks for chart data:', evaluation.id);
          continue;
        }

        let dayCompleted = 0;
        let dayTotal = 0;

        for (const task of tasks) {
          if (task && typeof task === 'object') {
            dayTotal++;
            totalTasks++;
            if (task.completed) {
              dayCompleted++;
              totalCompleted++;
              if (task.rating && typeof task.rating === 'number') {
                totalRating += task.rating;
                ratingCount++;
                // توزيع التقييمات (4=ممتاز، 3=جيد، 2=مقبول، 1=ضعيف)
                if (task.rating >= 1 && task.rating <= 4) {
                  ratingsDistribution[4 - task.rating]++;
                }
              }
            }
          }
        }

        // البيانات اليومية
        const completionRate = dayTotal > 0 ? (dayCompleted / dayTotal) * 100 : 0;
        dailyData.set(date, completionRate);

        // أداء المواقع
        const location = locations.find(l => l.id === evaluation.locationId);
        if (location) {
          const locationName = location.nameAr || location.nameEn || 'موقع غير محدد';
          if (!locationPerformance.has(locationName)) {
            locationPerformance.set(locationName, { completed: 0, total: 0 });
          }
          const locationData = locationPerformance.get(locationName);
          locationData.completed += dayCompleted;
          locationData.total += dayTotal;
        }
      }

      // تحضير بيانات الرسوم البيانية
      const dates = Array.from(dailyData.keys()).sort();
      const completionRates = dates.map(date => dailyData.get(date) || 0);

      const locationNames = Array.from(locationPerformance.keys());
      const locationCompletionRates = locationNames.map(name => {
        const data = locationPerformance.get(name);
        return data.total > 0 ? (data.completed / data.total) * 100 : 0;
      });

      const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      return {
        totalEvaluations: evaluations.length,
        totalLocations: Array.from(new Set(evaluations.map(e => e.locationId))).length,
        totalUsers: Array.from(new Set(evaluations.map(e => e.userId))).length,
        averageRating,
        dates,
        completionRates,
        ratingsDistribution,
        locationNames,
        locationCompletionRates
      };

    } catch (error) {
      console.error('Error preparing chart data:', error);
      return {
        totalEvaluations: 0,
        totalLocations: 0,
        totalUsers: 0,
        averageRating: 0,
        dates: [],
        completionRates: [],
        ratingsDistribution: [0, 0, 0, 0],
        locationNames: [],
        locationCompletionRates: []
      };
    }
  }

  private formatAnalysisContent(analysis: string): string {
    // تنسيق المحتوى للعرض في HTML
    return analysis
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
      .replace(/###\s+(.*)/g, '<h3>$1</h3>') // H3 headers
      .replace(/##\s+(.*)/g, '<h2>$1</h2>') // H2 headers
      .replace(/\n\n/g, '</p><p>') // Paragraphs
      .replace(/^(.*)$/gm, '<p>$1</p>') // Wrap lines in paragraphs
      .replace(/(<p><\/p>)/g, '') // Remove empty paragraphs
      .replace(/(<p><h[1-6]>.*?<\/h[1-6]><\/p>)/g, (match) => 
        match.replace(/<\/?p>/g, '')) // Remove p tags around headers
      .replace(/\n/g, '<br>'); // Line breaks
  }
}