import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Building2,
  MapPin,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Filter,
  Download
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface Company {
  id: number;
  nameAr: string;
  nameEn?: string;
}

interface ActiveCompanyAnalytics {
  companyId: number;
  companyName: string;
  totalLocations: number;
  completedEvaluations: number;
  averageScore: number;
  completionRate: number;
  activeUsers: number;
  lastEvaluationDate: string;
  trend: 'up' | 'down' | 'stable';
  criticalIssues: number;
  weeklyTrend: Array<{
    week: string;
    score: number;
    evaluations: number;
  }>;
  locationCategories: Array<{
    category: string;
    count: number;
    avgScore: number;
  }>;
}

const COLORS = ['#EAB308', '#F59E0B', '#D97706', '#92400E', '#78350F'];

export default function ActiveCompaniesAnalytics() {
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('month');

  // جلب الشركات (باستثناء الشركة المرجعية والشؤون الإدارية)
  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/enhanced-gm/active-companies'],
  });

  // جلب بيانات التحليلات للشركات الفعالة فقط
  const { data: analytics, isLoading } = useQuery<ActiveCompanyAnalytics[]>({
    queryKey: ['/api/enhanced-gm/active-companies-analytics', selectedCompany, timeRange],
  });

  const filteredAnalytics = analytics?.filter(data => 
    selectedCompany === 'all' || data.companyId.toString() === selectedCompany
  ) || [];

  // إحصائيات إجمالية للشركات الفعالة
  const overviewData = filteredAnalytics.reduce((acc, company) => ({
    totalActiveCompanies: filteredAnalytics.length,
    totalLocations: acc.totalLocations + company.totalLocations,
    totalEvaluations: acc.totalEvaluations + company.completedEvaluations,
    totalUsers: acc.totalUsers + company.activeUsers,
    averageCompletion: Math.round(
      filteredAnalytics.reduce((sum, c) => sum + c.completionRate, 0) / filteredAnalytics.length || 0
    ),
    averageScore: Math.round(
      filteredAnalytics.reduce((sum, c) => sum + c.averageScore, 0) / filteredAnalytics.length || 0
    ),
    totalCriticalIssues: acc.totalCriticalIssues + company.criticalIssues
  }), {
    totalActiveCompanies: 0,
    totalLocations: 0,
    totalEvaluations: 0,
    totalUsers: 0,
    averageCompletion: 0,
    averageScore: 0,
    totalCriticalIssues: 0
  });

  // بيانات المقارنة بين الشركات الفعالة
  const companyComparisonData = filteredAnalytics.map(company => ({
    name: company.companyName.length > 15 
      ? company.companyName.substring(0, 15) + '...' 
      : company.companyName,
    fullName: company.companyName,
    completionRate: company.completionRate,
    averageScore: company.averageScore,
    evaluations: company.completedEvaluations,
    locations: company.totalLocations
  }));

  // بيانات الاتجاهات الأسبوعية
  const weeklyTrendData = selectedCompany !== 'all' && filteredAnalytics.length === 1
    ? filteredAnalytics[0].weeklyTrend
    : [];

  // بيانات فئات المواقع
  const locationCategoriesData = selectedCompany !== 'all' && filteredAnalytics.length === 1
    ? filteredAnalytics[0].locationCategories
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">جارٍ تحميل تحليلات الشركات الفعالة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              تحليلات الشركات الفعالة
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              عرض تحليلي شامل لأداء الشركات التشغيلية الفعالة فقط
            </p>
            <Badge className="mt-2 bg-green-100 text-green-800 border-green-300">
              <CheckCircle className="w-3 h-3 ml-1" />
              استثناء الشركة المرجعية والشؤون الإدارية
            </Badge>
          </div>
          
          <div className="flex gap-3">
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="اختر الشركة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الشركات الفعالة</SelectItem>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.nameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="المدة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">أسبوع</SelectItem>
                <SelectItem value="month">شهر</SelectItem>
                <SelectItem value="quarter">ربع</SelectItem>
                <SelectItem value="year">سنة</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              تصدير
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  الشركات الفعالة
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overviewData.totalActiveCompanies}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  إجمالي المواقع
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overviewData.totalLocations}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  التقييمات المكتملة
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overviewData.totalEvaluations}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  متوسط النتائج
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overviewData.averageScore}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            مقارنة أداء الشركات الفعالة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={companyComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  `${value}${name === 'averageScore' ? '%' : ''}`,
                  name === 'averageScore' ? 'متوسط النتائج' : 
                  name === 'completionRate' ? 'معدل الإنجاز' : 'التقييمات'
                ]}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullName || label;
                }}
              />
              <Bar dataKey="averageScore" fill="#EAB308" name="متوسط النتائج" />
              <Bar dataKey="completionRate" fill="#F59E0B" name="معدل الإنجاز" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Companies Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            ملخص الشركات الفعالة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                    الشركة
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                    المواقع
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                    التقييمات
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                    متوسط النتائج
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                    معدل الإنجاز
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                    الحالة
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAnalytics.map((company, index) => (
                  <tr key={company.companyId} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" 
                             style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {company.companyName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {company.totalLocations}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {company.completedEvaluations}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {company.averageScore}%
                        </span>
                        {company.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                        {company.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-500 rounded-full"
                            style={{ width: `${company.completionRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {company.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge 
                        variant={company.criticalIssues > 0 ? "destructive" : "default"}
                        className={company.criticalIssues > 0 ? "" : "bg-green-100 text-green-800"}
                      >
                        {company.criticalIssues > 0 ? (
                          <>
                            <AlertTriangle className="w-3 h-3 ml-1" />
                            {company.criticalIssues} مشكلة
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 ml-1" />
                            ممتاز
                          </>
                        )}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Trend (Single Company View) */}
      {selectedCompany !== 'all' && weeklyTrendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              الاتجاه الأسبوعي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#EAB308" 
                  strokeWidth={2}
                  name="النتائج"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Location Categories (Single Company View) */}
      {selectedCompany !== 'all' && locationCategoriesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              فئات المواقع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={locationCategoriesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, value}) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {locationCategoriesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}