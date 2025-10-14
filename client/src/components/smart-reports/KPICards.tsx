import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle, 
  Users, 
  MapPin, 
  Calendar,
  Star,
  Target
} from 'lucide-react';
import type { KPIResponse } from '@shared/schema';

interface KPICardsProps {
  data: KPIResponse | null;
  isLoading: boolean;
  error?: string | null;
}

export default function KPICards({ data, isLoading, error }: KPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <BarChart3 className="w-8 h-8 mx-auto mb-2" />
            <p>خطأ في تحميل مؤشرات الأداء</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <BarChart3 className="w-8 h-8 mx-auto mb-2" />
            <p>لا توجد بيانات متاحة</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const kpiItems = [
    {
      title: 'إجمالي التقييمات',
      value: data.totalEvaluations.toLocaleString(),
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'عدد التقييمات المكتملة'
    },
    {
      title: 'معدل الإنجاز',
      value: `${data.completionRate.toFixed(1)}%`,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: `${data.completedTasks} من ${data.totalTasks} مهمة`,
      progress: data.completionRate
    },
    {
      title: 'متوسط التقييم',
      value: `${data.averageRating.toFixed(2)} / 4`,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: `${data.averageRatingPercent.toFixed(1)}% جودة`,
      progress: data.averageRatingPercent
    },
    {
      title: 'مجموع المهام',
      value: data.totalTasks.toLocaleString(),
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: `${data.completedTasks.toLocaleString()} مكتملة`
    },
    {
      title: 'المواقع النشطة',
      value: data.activeLocations.toString(),
      icon: MapPin,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'مواقع لها تقييمات'
    },
    {
      title: 'المستخدمون النشطون',
      value: data.activeUsers.toString(),
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      description: 'مستخدمون قاموا بتقييمات'
    },
    {
      title: 'الاتجاه العام',
      value: data.averageRatingPercent >= 80 ? 'ممتاز' : 
             data.averageRatingPercent >= 70 ? 'جيد' : 
             data.averageRatingPercent >= 60 ? 'مقبول' : 'يحتاج تحسين',
      icon: TrendingUp,
      color: data.averageRatingPercent >= 80 ? 'text-green-600' : 
             data.averageRatingPercent >= 70 ? 'text-blue-600' : 
             data.averageRatingPercent >= 60 ? 'text-yellow-600' : 'text-red-600',
      bgColor: data.averageRatingPercent >= 80 ? 'bg-green-50' : 
               data.averageRatingPercent >= 70 ? 'bg-blue-50' : 
               data.averageRatingPercent >= 60 ? 'bg-yellow-50' : 'bg-red-50',
      description: 'حالة الأداء العامة'
    },
    {
      title: 'كفاءة الإنجاز',
      value: data.totalEvaluations > 0 ? `${(data.totalTasks / data.totalEvaluations).toFixed(1)}` : '0',
      icon: BarChart3,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      description: 'متوسط المهام لكل تقييم'
    }
  ];

  return (
    <div className="space-y-4">
      {/* ملخص الأداء العام */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg border-l-4 border-yellow-400">
        <div className="text-center" data-testid="kpi-overall-completion">
          <div className="text-3xl font-bold text-yellow-600 mb-1">
            {data.completionRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">معدل الإنجاز العام</div>
          <Progress value={data.completionRate} className="mt-2" />
        </div>
        <div className="text-center" data-testid="kpi-overall-quality">
          <div className="text-3xl font-bold text-yellow-600 mb-1">
            {data.averageRatingPercent.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">جودة التقييم العامة</div>
          <Progress value={data.averageRatingPercent} className="mt-2" />
        </div>
        <div className="text-center" data-testid="kpi-overall-evaluations">
          <div className="text-3xl font-bold text-yellow-600 mb-1">
            {data.totalEvaluations.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">إجمالي التقييمات</div>
          <div className="text-xs text-gray-500 mt-2">
            {data.activeLocations} مواقع × {data.activeUsers} مستخدمين
          </div>
        </div>
      </div>

      {/* بطاقات مؤشرات الأداء التفصيلية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiItems.map((item, index) => {
          const Icon = item.icon;
          
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${item.bgColor}`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div className={`text-right ${item.color} text-xs font-medium`}>
                    مؤشر {index + 1}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className={`text-2xl font-bold ${item.color}`} data-testid={`kpi-${index}-value`}>
                    {item.value}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.description}
                  </div>
                  
                  {item.progress !== undefined && (
                    <div className="mt-3">
                      <Progress 
                        value={item.progress} 
                        className="h-2"
                        data-testid={`kpi-${index}-progress`}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* تحليل سريع */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">تحليل سريع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2 text-green-600">نقاط القوة:</h4>
              <ul className="space-y-1 text-gray-600">
                {data.completionRate >= 90 && <li>• معدل إنجاز ممتاز ({data.completionRate.toFixed(1)}%)</li>}
                {data.averageRatingPercent >= 80 && <li>• جودة تقييم عالية ({data.averageRatingPercent.toFixed(1)}%)</li>}
                {data.totalEvaluations >= 100 && <li>• حجم بيانات كبير ({data.totalEvaluations} تقييم)</li>}
                {data.activeLocations >= 5 && <li>• تغطية جيدة للمواقع ({data.activeLocations} موقع)</li>}
                {data.activeUsers >= 3 && <li>• مشاركة متعددة المستخدمين ({data.activeUsers} مستخدم)</li>}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-red-600">مناطق التحسين:</h4>
              <ul className="space-y-1 text-gray-600">
                {data.completionRate < 70 && <li>• معدل إنجاز منخفض ({data.completionRate.toFixed(1)}%)</li>}
                {data.averageRatingPercent < 60 && <li>• جودة تقييم تحتاج تطوير ({data.averageRatingPercent.toFixed(1)}%)</li>}
                {data.totalEvaluations < 20 && <li>• حجم بيانات قليل ({data.totalEvaluations} تقييم)</li>}
                {data.activeLocations < 3 && <li>• تغطية محدودة للمواقع ({data.activeLocations} موقع)</li>}
                {data.activeUsers < 2 && <li>• مشاركة محدودة ({data.activeUsers} مستخدم)</li>}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}