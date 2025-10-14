import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, ArrowLeft, TrendingUp, TrendingDown, Target, Lightbulb, MessageSquare, BarChart3 } from 'lucide-react';

interface SmartAnalysisResult {
  success: boolean;
  generatedAt: string;
  analysis: {
    summary: {
      totalEvaluations: number;
      averageScore: number;
      uniqueLocations: number;
    };
    insights: string;
    recommendations: string[];
    strengths: string[];
    weaknesses: string[];
    sentiment: {
      positive: number;
      negative: number;
      neutral: number;
    };
    trends: any[];
    locationBreakdown: any[];
  };
}

export default function SmartAnalysisPage() {
  const [, setLocation] = useLocation();
  const [analysisData, setAnalysisData] = useState<SmartAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // استرجاع نتائج التحليل من SessionStorage أو LocalStorage
    const savedAnalysis = sessionStorage.getItem('smart_analysis_result');
    if (savedAnalysis) {
      try {
        const data = JSON.parse(savedAnalysis);
        setAnalysisData(data);
      } catch (error) {
        console.error('خطأ في استرجاع بيانات التحليل:', error);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل نتائج التحليل...</p>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6" dir="rtl">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center">
            <CardContent className="p-8">
              <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                لا توجد نتائج تحليل
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                يرجى العودة إلى صفحة التقارير وتشغيل التحليل الذكي
              </p>
              <Button onClick={() => setLocation('/reports')} className="bg-purple-600 hover:bg-purple-700">
                <ArrowLeft className="w-4 h-4 ml-2" />
                العودة إلى التقارير
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { analysis } = analysisData;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* الهيدر */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-600" />
              🧠 نتائج التحليل الذكي
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              تحليل شامل بالذكاء الاصطناعي لبيانات بيئة العمل
            </p>
          </div>
          <Button 
            onClick={() => setLocation('/reports')} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            العودة إلى التقارير
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* الملخص السريع */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                الملخص التنفيذي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{analysis.summary.totalEvaluations}</div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">إجمالي التقييمات</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{analysis.summary.averageScore}%</div>
                  <div className="text-sm text-green-800 dark:text-green-200">متوسط الأداء</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{analysis.summary.uniqueLocations}</div>
                  <div className="text-sm text-purple-800 dark:text-purple-200">عدد المواقع</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الرؤى والتحليل */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                الرؤى والتحليل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                  {analysis.insights}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* تحليل المشاعر */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                تحليل المشاعر
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>إيجابي</span>
                  <span className="font-bold text-green-600">{analysis.sentiment.positive}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${analysis.sentiment.positive}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>محايد</span>
                  <span className="font-bold text-gray-600">{analysis.sentiment.neutral}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gray-500 h-2 rounded-full" 
                    style={{ width: `${analysis.sentiment.neutral}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>سلبي</span>
                  <span className="font-bold text-red-600">{analysis.sentiment.negative}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${analysis.sentiment.negative}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* نقاط القوة */}
          {analysis.strengths.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  نقاط القوة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* نقاط الضعف */}
          {analysis.weaknesses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  نقاط الضعف
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.weaknesses.map((weakness, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{weakness}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* التوصيات */}
          {analysis.recommendations.length > 0 && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  التوصيات والإجراءات المقترحة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.recommendations.map((recommendation, index) => (
                    <div key={index} className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{recommendation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* معلومات التوليد */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          تم إنشاء هذا التحليل في: {new Date(analysisData.generatedAt).toLocaleString('ar-EG')}
        </div>
      </div>
    </div>
  );
}