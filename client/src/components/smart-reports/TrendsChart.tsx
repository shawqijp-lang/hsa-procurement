import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react';
import type { TrendSeries, TrendDataPoint } from '@shared/schema';

interface TrendsChartProps {
  data: TrendSeries | null;
  isLoading: boolean;
  error?: string | null;
}

export default function TrendsChart({ data, isLoading, error }: TrendsChartProps) {
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <BarChart3 className="w-8 h-8 mx-auto mb-2" />
            <p>خطأ في تحميل بيانات الاتجاهات</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <BarChart3 className="w-8 h-8 mx-auto mb-2" />
            <p>لا توجد بيانات اتجاهات متاحة</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // تحويل بيانات التقييم من 0-4 إلى 0-100 للمقارنة مع معدل الإنجاز
  const chartData = data.data.map(point => ({
    ...point,
    averageRatingPercent: (point.averageRating / 4) * 100
  }));

  const trendIcon = data.summary.trend === 'improving' ? TrendingUp : 
                   data.summary.trend === 'declining' ? TrendingDown : 
                   Calendar;
  
  const trendColor = data.summary.trend === 'improving' ? 'text-green-600' : 
                    data.summary.trend === 'declining' ? 'text-red-600' : 
                    'text-gray-600';
  
  const trendBg = data.summary.trend === 'improving' ? 'bg-green-100' : 
                 data.summary.trend === 'declining' ? 'bg-red-100' : 
                 'bg-gray-100';

  // حساب الإحصائيات
  const totalEvaluations = chartData.reduce((sum, point) => sum + point.evaluationsCount, 0);
  const totalTasks = chartData.reduce((sum, point) => sum + point.tasksCount, 0);
  const avgCompletion = chartData.length > 0 ? 
    chartData.reduce((sum, point) => sum + point.completionRate, 0) / chartData.length : 0;
  const avgRating = chartData.length > 0 ? 
    chartData.reduce((sum, point) => sum + point.averageRatingPercent, 0) / chartData.length : 0;

  return (
    <div className="space-y-4">
      {/* ملخص الاتجاهات */}
      <Card className={`${trendBg} border-l-4 ${data.summary.trend === 'improving' ? 'border-green-500' : data.summary.trend === 'declining' ? 'border-red-500' : 'border-gray-500'}`}>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center" data-testid="trend-summary-direction">
              <div className={`flex items-center justify-center gap-2 text-xl font-bold ${trendColor} mb-1`}>
                {React.createElement(trendIcon, { className: 'w-5 h-5' })}
                <span>
                  {data.summary.trend === 'improving' ? 'تحسن' : 
                   data.summary.trend === 'declining' ? 'تراجع' : 'مستقر'}
                </span>
              </div>
              <div className="text-sm text-gray-600">الاتجاه العام</div>
            </div>
            <div className="text-center" data-testid="trend-summary-improvement">
              <div className="text-xl font-bold text-blue-600 mb-1">
                {Math.abs(data.summary.averageImprovement).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">
                {data.summary.averageImprovement >= 0 ? 'تحسن' : 'تغيير'}
              </div>
            </div>
            <div className="text-center" data-testid="trend-summary-evaluations">
              <div className="text-xl font-bold text-purple-600 mb-1">
                {totalEvaluations}
              </div>
              <div className="text-sm text-gray-600">إجمالي التقييمات</div>
            </div>
            <div className="text-center" data-testid="trend-summary-tasks">
              <div className="text-xl font-bold text-indigo-600 mb-1">
                {totalTasks}
              </div>
              <div className="text-sm text-gray-600">إجمالي المهام</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الرسم البياني الرئيسي */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              اتجاهات الأداء - {data.period}
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-green-600">
                معدل الإنجاز: {avgCompletion.toFixed(1)}%
              </Badge>
              <Badge variant="outline" className="text-blue-600">
                جودة التقييم: {avgRating.toFixed(1)}%
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="label" 
                  fontSize={12}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  fontSize={12}
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg">
                          <p className="font-semibold mb-2">{label}</p>
                          <div className="space-y-1 text-sm">
                            <p className="text-green-600">
                              معدل الإنجاز: {data.completionRate.toFixed(1)}%
                            </p>
                            <p className="text-blue-600">
                              جودة التقييم: {data.averageRatingPercent.toFixed(1)}%
                            </p>
                            <p className="text-purple-600">
                              التقييمات: {data.evaluationsCount}
                            </p>
                            <p className="text-gray-600">
                              المهام: {data.tasksCount}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="completionRate"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#completionGradient)"
                  name="معدل الإنجاز (%)"
                />
                <Area
                  type="monotone"
                  dataKey="averageRatingPercent"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#ratingGradient)"
                  name="جودة التقييم (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* تفاصيل الفترات المميزة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              أفضل فترة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.summary.bestPeriod ? (
              <div className="space-y-2">
                <p className="font-semibold">{data.summary.bestPeriod}</p>
                {chartData.find(p => p.date === data.summary.bestPeriod) && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">الإنجاز: </span>
                      <span className="font-semibold">
                        {chartData.find(p => p.date === data.summary.bestPeriod)!.completionRate.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">الجودة: </span>
                      <span className="font-semibold">
                        {chartData.find(p => p.date === data.summary.bestPeriod)!.averageRatingPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              أضعف فترة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.summary.worstPeriod ? (
              <div className="space-y-2">
                <p className="font-semibold">{data.summary.worstPeriod}</p>
                {chartData.find(p => p.date === data.summary.worstPeriod) && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">الإنجاز: </span>
                      <span className="font-semibold">
                        {chartData.find(p => p.date === data.summary.worstPeriod)!.completionRate.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">الجودة: </span>
                      <span className="font-semibold">
                        {chartData.find(p => p.date === data.summary.worstPeriod)!.averageRatingPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}