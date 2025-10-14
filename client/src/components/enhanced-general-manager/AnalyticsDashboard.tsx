import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Building2, Users, MapPin, CheckCircle } from 'lucide-react';

interface Company {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface CompanyAnalytics {
  companyId: number;
  companyName: string;
  totalLocations: number;
  completedEvaluations: number;
  averageScore: number;
  completionRate: number;
  activeUsers: number;
  weeklyTrend: Array<{ day: string; evaluations: number; score: number }>;
  locationCategories: Array<{ category: string; count: number }>;
  performanceByLocation: Array<{ location: string; score: number; evaluations: number }>;
}

const COLORS = ['#facc15', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function AnalyticsDashboard() {
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('month');

  // Fetch companies
  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/enhanced-gm/companies'],
  });

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery<CompanyAnalytics[]>({
    queryKey: ['/api/enhanced-gm/analytics', selectedCompany, timeRange],
  });

  const filteredAnalytics = analytics?.filter(data => 
    selectedCompany === 'all' || data.companyId.toString() === selectedCompany
  ) || [];

  // Aggregate data for overview
  const overviewData = filteredAnalytics.reduce((acc, company) => ({
    totalCompanies: filteredAnalytics.length,
    totalLocations: acc.totalLocations + company.totalLocations,
    totalEvaluations: acc.totalEvaluations + company.completedEvaluations,
    totalUsers: acc.totalUsers + company.activeUsers,
    averageCompletion: Math.round(
      filteredAnalytics.reduce((sum, c) => sum + c.completionRate, 0) / filteredAnalytics.length || 0
    ),
    averageScore: Math.round(
      filteredAnalytics.reduce((sum, c) => sum + c.averageScore, 0) / filteredAnalytics.length || 0
    )
  }), {
    totalCompanies: 0,
    totalLocations: 0,
    totalEvaluations: 0,
    totalUsers: 0,
    averageCompletion: 0,
    averageScore: 0
  });

  // Prepare chart data
  const companyComparisonData = filteredAnalytics.map(company => ({
    name: company.companyName.split(' ')[0], // Short name for chart
    completionRate: company.completionRate,
    averageScore: company.averageScore,
    evaluations: company.completedEvaluations
  }));

  const weeklyTrendData = selectedCompany !== 'all' && filteredAnalytics.length === 1
    ? filteredAnalytics[0].weeklyTrend
    : [];

  const locationCategoriesData = selectedCompany !== 'all' && filteredAnalytics.length === 1
    ? filteredAnalytics[0].locationCategories
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">جارٍ تحميل التحليلات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              داشبورد التحليلات المتقدمة
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              تحليلات شاملة وتقارير بيانية تفاعلية لجميع الشركات
            </p>
          </div>
          <BarChart3 className="h-8 w-8 text-purple-600" />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 space-x-reverse">
          <div className="flex items-center space-x-2 space-x-reverse">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">الشركة:</label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="اختر الشركة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الشركات</SelectItem>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.nameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">الفترة:</label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">أسبوع</SelectItem>
                <SelectItem value="month">شهر</SelectItem>
                <SelectItem value="quarter">ربع سنة</SelectItem>
                <SelectItem value="year">سنة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الشركات</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{overviewData.totalCompanies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المواقع</CardTitle>
            <MapPin className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overviewData.totalLocations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التقييمات</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{overviewData.totalEvaluations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{overviewData.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الإنجاز</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{overviewData.averageCompletion}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الدرجات</CardTitle>
            <Activity className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overviewData.averageScore}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="comparison">مقارنة الشركات</TabsTrigger>
          <TabsTrigger value="trend">الاتجاهات الزمنية</TabsTrigger>
          <TabsTrigger value="categories">فئات المواقع</TabsTrigger>
          <TabsTrigger value="performance">أداء المواقع</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>مقارنة أداء الشركات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={companyComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${value}${name === 'completionRate' || name === 'averageScore' ? '%' : ''}`,
                        name === 'completionRate' ? 'معدل الإنجاز' :
                        name === 'averageScore' ? 'متوسط الدرجات' : 'التقييمات'
                      ]}
                    />
                    <Bar dataKey="completionRate" fill="#facc15" name="completionRate" />
                    <Bar dataKey="averageScore" fill="#3b82f6" name="averageScore" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>الاتجاهات الأسبوعية</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyTrendData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="evaluations" stroke="#facc15" name="التقييمات" />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" name="الدرجات" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">اختر شركة محددة لعرض الاتجاهات الزمنية</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>توزيع فئات المواقع</CardTitle>
            </CardHeader>
            <CardContent>
              {locationCategoriesData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={locationCategoriesData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
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
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <PieChartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">اختر شركة محددة لعرض توزيع فئات المواقع</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>أداء المواقع الفردية</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCompany !== 'all' && filteredAnalytics.length === 1 ? (
                <div className="space-y-4">
                  {filteredAnalytics[0].performanceByLocation.map((location, index) => (
                    <div key={index} className="flex items-center space-x-4 space-x-reverse p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{location.location}</h4>
                        <p className="text-sm text-gray-600">{location.evaluations} تقييم</p>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Badge 
                          variant={location.score >= 80 ? "default" : location.score >= 60 ? "secondary" : "destructive"}
                        >
                          {location.score}%
                        </Badge>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              location.score >= 80 ? 'bg-green-500' :
                              location.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${location.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">اختر شركة محددة لعرض أداء المواقع الفردية</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}