import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  LineChart, 
  Users, 
  MapPin, 
  Calendar,
  Activity,
  Target,
  Award,
  AlertTriangle,
  Download,
  Printer,
  Share2,
  Zap,
  Globe,
  Maximize2,
  Monitor
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface InteractiveHtmlReportProps {
  reportData: any;
  onClose: () => void;
}

// مكون رسم بياني مبسط للأعمدة
const SimpleBarChart = ({ data, title, className = "", height = 200 }: { 
  data: any[], 
  title: string, 
  className?: string,
  height?: number 
}) => {
  const maxValue = Math.max(...data.map(item => item.value || 0));
  
  return (
    <div className={`p-4 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{title}</h4>
      <div className="flex items-end space-x-2 space-x-reverse" style={{ height }}>
        {data.map((item, index) => {
          const heightPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={index} className="flex flex-col items-center flex-1 min-w-0">
              <div 
                className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md w-full flex items-end justify-center text-white text-xs font-medium transition-all hover:from-blue-700 hover:to-blue-500 cursor-pointer relative group"
                style={{ height: `${heightPercent}%`, minHeight: '20px' }}
              >
                <span className="mb-1">{item.value}</span>
                {/* نصائح تفاعلية عند التمرير */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {item.label}: {item.value}%
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center truncate w-full" title={item.label}>
                {item.label.length > 8 ? `${item.label.substring(0, 8)}...` : item.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// مكون رسم بياني دائري مبسط
const SimplePieChart = ({ data, title, className = "" }: { 
  data: any[], 
  title: string, 
  className?: string 
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativeAngle = 0;
  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316'];
  
  const size = 120;
  const center = size / 2;
  const radius = 45;
  
  return (
    <div className={`p-4 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{title}</h4>
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            {data.map((item, index) => {
              const percentage = total > 0 ? (item.value / total) * 100 : 0;
              const angle = (percentage / 100) * 360;
              const startAngle = cumulativeAngle;
              cumulativeAngle += angle;
              
              const startAngleRad = (startAngle * Math.PI) / 180;
              const endAngleRad = (cumulativeAngle * Math.PI) / 180;
              
              const x1 = center + radius * Math.cos(startAngleRad);
              const y1 = center + radius * Math.sin(startAngleRad);
              const x2 = center + radius * Math.cos(endAngleRad);
              const y2 = center + radius * Math.sin(endAngleRad);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const pathData = [
                `M ${center} ${center}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <title>{`${item.label}: ${percentage.toFixed(1)}%`}</title>
                </path>
              );
            })}
          </svg>
        </div>
        <div className="ml-4 space-y-1">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-2 space-x-reverse text-xs">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// مكون رسم بياني خطي مبسط
const SimpleLineChart = ({ data, title, className = "" }: { 
  data: any[], 
  title: string, 
  className?: string 
}) => {
  const maxValue = Math.max(...data.map(item => item.value || 0));
  const minValue = Math.min(...data.map(item => item.value || 0));
  const range = maxValue - minValue || 1;
  
  const width = 300;
  const height = 150;
  const padding = 20;
  
  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((item.value - minValue) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <div className={`p-4 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{title}</h4>
      <div className="flex justify-center">
        <svg width={width} height={height} className="border border-gray-200 dark:border-gray-700 rounded">
          {/* خطوط الشبكة */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />
          
          {/* الخط الرئيسي */}
          <polyline
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            points={points}
            className="drop-shadow-sm"
          />
          
          {/* النقاط */}
          {data.map((item, index) => {
            const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((item.value - minValue) / range) * (height - 2 * padding);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="#3B82F6"
                stroke="#ffffff"
                strokeWidth="2"
                className="hover:r-6 transition-all cursor-pointer"
              >
                <title>{`${item.label}: ${item.value}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default function InteractiveHtmlReport({ reportData, onClose }: InteractiveHtmlReportProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // بيانات للرسوم البيانية
  const locationChartData = reportData.locationPerformance?.slice(0, 8).map((loc: any) => ({
    label: loc.locationName,
    value: loc.averageRating
  })) || [];

  const categoryChartData = reportData.categoryPerformance?.slice(0, 6).map((cat: any) => ({
    label: cat.categoryName,
    value: cat.averageRating
  })) || [];

  const timeSeriesData = reportData.timeSeriesData?.slice(-7).map((day: any) => ({
    label: new Date(day.date).toLocaleDateString('ar-EG', { 
      calendar: 'gregory',
      day: 'numeric',
      month: 'short'
    }),
    value: day.averageRating
  })) || [];

  const userPerformanceData = reportData.userPerformance?.slice(0, 5).map((user: any) => ({
    label: user.userName,
    value: user.averageRating
  })) || [];

  // وظيفة طباعة التقرير
  const handlePrint = () => {
    window.print();
  };

  // وظيفة تحميل التقرير كـ HTML
  const handleDownload = () => {
    const htmlContent = reportRef.current?.innerHTML || '';
    const fullHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير تقييم بيئة العمل التفاعلي - HSA Group</title>
  <style>
    body { font-family: 'Arial', sans-serif; margin: 20px; background: #f8fafc; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { text-align: center; border-bottom: 3px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .kpi-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
    .chart-section { margin: 30px 0; }
    @media print { body { margin: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="container">
    ${htmlContent}
  </div>
</body>
</html>`;
    
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HSA_Interactive_Report_${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={`w-full ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''} transition-all duration-300`}>
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Monitor className="w-6 h-6" />
            📊 التقرير التفاعلي - بأحدث التقنيات العالمية
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="no-print"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              className="no-print"
            >
              <Printer className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              className="no-print"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="no-print"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* معلومات التقرير */}
        <div className="text-sm opacity-90 mt-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              الفترة: {reportData.metadata?.dateRange?.start} إلى {reportData.metadata?.dateRange?.end}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              المقيّمون: {reportData.kpis?.uniqueEvaluators || 0}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              المواقع: {reportData.kpis?.uniqueLocations || 0}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-4 h-4" />
              التقييمات: {reportData.kpis?.totalEvaluations || 0}
            </span>
          </div>
        </div>
      </CardHeader>

      <div ref={reportRef}>
        <CardContent className="p-0">
          {/* التبويبات */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 no-print">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                نظرة عامة
              </TabsTrigger>
              <TabsTrigger value="charts" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                المخططات
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                الأداء
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                التفاصيل
              </TabsTrigger>
            </TabsList>

            {/* تبويب النظرة العامة */}
            <TabsContent value="overview" className="p-6">
              <div className="space-y-6">
                {/* المؤشرات الرئيسية */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{reportData.kpis?.overallAverageRating || 0}%</div>
                      <div className="text-sm opacity-90">التقييم العام</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{reportData.kpis?.completionRate || 0}%</div>
                      <div className="text-sm opacity-90">نسبة الإنجاز</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{reportData.kpis?.totalEvaluations || 0}</div>
                      <div className="text-sm opacity-90">إجمالي التقييمات</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{reportData.kpis?.averageTasksPerEvaluation || 0}</div>
                      <div className="text-sm opacity-90">متوسط المهام</div>
                    </CardContent>
                  </Card>
                </div>

                {/* أفضل وأسوأ الأداءات */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reportData.kpis?.topPerformingLocation && (
                    <Card className="border-l-4 border-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Award className="w-8 h-8 text-green-600" />
                          <div>
                            <h3 className="font-semibold text-green-700">أفضل موقع أداء</h3>
                            <p className="text-lg font-bold">{reportData.kpis.topPerformingLocation.locationName}</p>
                            <p className="text-sm text-gray-600">{reportData.kpis.topPerformingLocation.averageRating}% متوسط التقييم</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {reportData.kpis?.lowestPerformingLocation && (
                    <Card className="border-l-4 border-red-500">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-8 h-8 text-red-600" />
                          <div>
                            <h3 className="font-semibold text-red-700">يحتاج تحسين</h3>
                            <p className="text-lg font-bold">{reportData.kpis.lowestPerformingLocation.locationName}</p>
                            <p className="text-sm text-gray-600">{reportData.kpis.lowestPerformingLocation.averageRating}% متوسط التقييم</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* اتجاهات الأداء */}
                {reportData.trendAnalysis?.weeklyTrends?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        تحليل الاتجاهات
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {reportData.trendAnalysis.weeklyTrends.map((trend: any, index: number) => (
                          <div key={index} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="text-xl font-bold text-blue-600">{trend.averageRating}%</div>
                            <div className="text-sm text-gray-600">
                              {trend.period === 'first_week' ? 'الأسبوع الأول' : 'الأسبوع الأخير'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* تبويب المخططات */}
            <TabsContent value="charts" className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <SimpleBarChart 
                    data={locationChartData} 
                    title="أداء المواقع" 
                    height={250}
                  />
                </Card>
                
                <Card>
                  <SimplePieChart 
                    data={categoryChartData.slice(0, 5)} 
                    title="توزيع أداء الفئات" 
                  />
                </Card>
                
                <Card>
                  <SimpleLineChart 
                    data={timeSeriesData} 
                    title="اتجاه الأداء الأسبوعي" 
                  />
                </Card>
                
                <Card>
                  <SimpleBarChart 
                    data={userPerformanceData} 
                    title="أداء المقيّمين" 
                    height={250}
                  />
                </Card>
              </div>
            </TabsContent>

            {/* تبويب الأداء */}
            <TabsContent value="performance" className="p-6">
              <div className="space-y-6">
                {/* أداء المواقع */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      تفاصيل أداء المواقع
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {reportData.locationPerformance?.map((location: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div>
                              <h4 className="font-medium">{location.locationName}</h4>
                              <p className="text-sm text-gray-600">{location.evaluationCount} تقييم</p>
                            </div>
                            <div className="text-left">
                              <Badge variant={location.averageRating >= 80 ? 'default' : location.averageRating >= 60 ? 'secondary' : 'destructive'}>
                                {location.averageRating}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* أداء الفئات */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      أداء الفئات
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {reportData.categoryPerformance?.map((category: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <h4 className="font-medium">{category.categoryName}</h4>
                            <p className="text-sm text-gray-600">{category.taskCount} مهمة</p>
                          </div>
                          <Badge variant={category.averageRating >= 80 ? 'default' : category.averageRating >= 60 ? 'secondary' : 'destructive'}>
                            {category.averageRating}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* تبويب التفاصيل */}
            <TabsContent value="details" className="p-6">
              <div className="space-y-6">
                {/* أداء المقيّمين */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      تفاصيل أداء المقيّمين
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {reportData.userPerformance?.map((user: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div>
                              <h4 className="font-medium">{user.userName}</h4>
                              <p className="text-sm text-gray-600">{user.evaluationCount} تقييم • {user.totalTasks} مهمة</p>
                            </div>
                            <div className="text-left">
                              <Badge variant={user.averageRating >= 80 ? 'default' : user.averageRating >= 60 ? 'secondary' : 'destructive'}>
                                {user.averageRating}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* مناطق التحسين */}
                {reportData.trendAnalysis?.improvementAreas?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        مناطق تحتاج تحسين
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {reportData.trendAnalysis.improvementAreas.map((area: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200">
                            <div>
                              <h4 className="font-medium text-orange-800 dark:text-orange-300">{area.categoryName}</h4>
                              <p className="text-sm text-orange-600">{area.taskCount} مهمة</p>
                            </div>
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              {area.averageRating}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* القضايا الحرجة */}
                {reportData.trendAnalysis?.criticalIssues?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        قضايا تحتاج اهتمام فوري
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-48">
                        <div className="space-y-3">
                          {reportData.trendAnalysis.criticalIssues.map((issue: any, index: number) => (
                            <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-red-800 dark:text-red-300">{issue.taskName}</h4>
                                  <p className="text-sm text-red-600 mt-1">{issue.locationName}</p>
                                  <p className="text-xs text-gray-600 mt-1">{issue.datetime}</p>
                                </div>
                                <Badge variant="destructive" className="ml-2">
                                  {issue.rating}
                                </Badge>
                              </div>
                              {issue.itemComment && issue.itemComment !== 'لا توجد تعليقات' && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 p-2 bg-white dark:bg-gray-800 rounded">
                                  "{issue.itemComment}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </div>

      {/* التذييل */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 text-center text-sm text-gray-600 dark:text-gray-400 border-t">
        <div className="flex items-center justify-center gap-2">
          <Globe className="w-4 h-4" />
          <span>تقرير مُنشأ بأحدث التقنيات العالمية • HSA Group</span>
          <Zap className="w-4 h-4" />
        </div>
        <p className="mt-1">
          تم إنشاؤه في {new Date().toLocaleDateString('ar-EG', { 
            calendar: 'gregory',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </Card>
  );
}