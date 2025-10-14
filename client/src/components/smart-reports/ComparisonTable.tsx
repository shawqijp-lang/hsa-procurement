import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  MapPin, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertTriangle,
  Crown,
  Target,
  BarChart3
} from 'lucide-react';
import type { ComparisonResponse, ComparisonRow } from '@shared/schema';

// نوع محلي للبيانات المستخدمة في المكون
type ComparisonItem = ComparisonRow;

interface ComparisonTableProps {
  data: ComparisonResponse | null;
  isLoading: boolean;
  error?: string | null;
}

export default function ComparisonTable({ data, isLoading, error }: ComparisonTableProps) {
  const [sortBy, setSortBy] = useState<'rating' | 'completion' | 'evaluations'>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
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
            <p>خطأ في تحميل بيانات المقارنات</p>
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
            <p>لا توجد بيانات مقارنات متاحة</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortData = (items: ComparisonItem[]) => {
    return [...items].sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'completion':
          aValue = a.currentPeriod.completionRate;
          bValue = b.currentPeriod.completionRate;
          break;
        case 'evaluations':
          aValue = a.currentPeriod.evaluationsCount;
          bValue = b.currentPeriod.evaluationsCount;
          break;
        default:
          aValue = a.currentPeriod.averageRating;
          bValue = b.currentPeriod.averageRating;
      }
      
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
  };

  const getPerformanceBadge = (performance: string) => {
    switch (performance) {
      case 'excellent':
        return <Badge className="bg-green-100 text-green-800">ممتاز</Badge>;
      case 'good':
        return <Badge className="bg-blue-100 text-blue-800">جيد</Badge>;
      case 'average':
        return <Badge className="bg-yellow-100 text-yellow-800">متوسط</Badge>;
      case 'poor':
        return <Badge className="bg-red-100 text-red-800">ضعيف</Badge>;
      default:
        return <Badge variant="outline">غير محدد</Badge>;
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (rank <= 3) return <Award className="w-4 h-4 text-blue-500" />;
    return <Target className="w-4 h-4 text-gray-500" />;
  };

  const renderComparisonTable = (items: ComparisonItem[], type: 'location' | 'user') => {
    const sortedItems = sortData(items);
    
    return (
      <div className="space-y-4">
        {/* أزرار الترتيب */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={sortBy === 'rating' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('rating')}
            data-testid={`sort-${type}-rating`}
          >
            ترتيب حسب التقييم
          </Button>
          <Button
            variant={sortBy === 'completion' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('completion')}
            data-testid={`sort-${type}-completion`}
          >
            ترتيب حسب الإنجاز
          </Button>
          <Button
            variant={sortBy === 'evaluations' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('evaluations')}
            data-testid={`sort-${type}-evaluations`}
          >
            ترتيب حسب عدد التقييمات
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            data-testid={`sort-${type}-order`}
          >
            {sortOrder === 'desc' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            {sortOrder === 'desc' ? 'تنازلي' : 'تصاعدي'}
          </Button>
        </div>

        {/* الجدول */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الترتيب</TableHead>
                <TableHead className="text-right">
                  {type === 'location' ? 'الموقع' : 'المستخدم'}
                </TableHead>
                <TableHead className="text-right">التقييم</TableHead>
                <TableHead className="text-right">الإنجاز</TableHead>
                <TableHead className="text-right">التقييمات</TableHead>
                <TableHead className="text-right">المهام</TableHead>
                <TableHead className="text-right">الأداء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    لا توجد بيانات متاحة
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item, index) => (
                  <TableRow 
                    key={item.id} 
                    className={index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}
                    data-testid={`${type}-row-${item.id}`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getRankIcon(index + 1)}
                        <span>#{index + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold max-w-32 truncate">
                      {item.name}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-semibold text-blue-600">
                          {item.currentPeriod.averageRating.toFixed(2)} / 4
                        </div>
                        <Progress 
                          value={(item.currentPeriod.averageRating / 4) * 100} 
                          className="h-1" 
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-semibold text-green-600">
                          {item.currentPeriod.completionRate.toFixed(1)}%
                        </div>
                        <Progress 
                          value={item.currentPeriod.completionRate} 
                          className="h-1" 
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-purple-600">
                      {item.currentPeriod.evaluationsCount}
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      {item.currentPeriod.tasksCount}
                    </TableCell>
                    <TableCell>
                      {getPerformanceBadge(item.change?.performance || 'average')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* إحصائيات سريعة */}
        {sortedItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {sortedItems[0].currentPeriod.averageRating.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">أعلى تقييم</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.max(...sortedItems.map(item => item.currentPeriod.completionRate)).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">أعلى إنجاز</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {sortedItems.reduce((sum, item) => sum + item.currentPeriod.evaluationsCount, 0)}
              </div>
              <div className="text-sm text-gray-600">إجمالي التقييمات</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ملخص الأداء العام */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.summary.topPerformer && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-green-700 flex items-center gap-2 text-lg">
                <Crown className="w-5 h-5" />
                أفضل أداء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-semibold text-lg" data-testid="top-performer-name">
                  {data.summary.topPerformer.name}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">التقييم: </span>
                    <span className="font-semibold">
                      {data.summary.topPerformer.currentPeriod.averageRating.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">الإنجاز: </span>
                    <span className="font-semibold">
                      {data.summary.topPerformer.currentPeriod.completionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {data.summary.mostImproved && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-700 flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5" />
                أكثر تحسناً
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-semibold text-lg">
                  {data.summary.mostImproved.name}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">التقييم: </span>
                    <span className="font-semibold">
                      {data.summary.mostImproved.currentPeriod.averageRating.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">الإنجاز: </span>
                    <span className="font-semibold">
                      {data.summary.mostImproved.currentPeriod.completionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-700 flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5" />
              يحتاج انتباه
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.summary.needsAttention.length === 0 ? (
              <p className="text-sm text-gray-500">لا توجد عناصر تحتاج انتباه</p>
            ) : (
              <div className="space-y-2">
                {data.summary.needsAttention.slice(0, 3).map((item, index) => (
                  <div key={item.id} className="text-sm">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-gray-600 text-xs">
                      {item.currentPeriod.averageRating.toFixed(1)} - 
                      {item.currentPeriod.completionRate.toFixed(1)}%
                    </p>
                  </div>
                ))}
                {data.summary.needsAttention.length > 3 && (
                  <p className="text-xs text-gray-500">
                    +{data.summary.needsAttention.length - 3} أكثر
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* تبويبات المقارنة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            مقارنات تفصيلية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="locations" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="locations" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                المواقع ({data.locations.length})
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                المستخدمون ({data.users.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="locations" className="mt-6">
              {renderComparisonTable(data.locations, 'location')}
            </TabsContent>
            <TabsContent value="users" className="mt-6">
              {renderComparisonTable(data.users, 'user')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}