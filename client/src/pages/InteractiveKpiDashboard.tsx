import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { 
  Calendar,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  Building2,
  MapPin,
  RefreshCw,
  Filter
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Types
interface Company {
  id: number;
  nameAr: string;
  isActive: boolean;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  companyId: number;
}

interface InteractiveKpiData {
  // General metrics
  totalAssessments: number;
  totalLocations: number;
  totalUsers: number;
  averageScore: number;
  
  // Time-based metrics
  assessmentsInPeriod: number;
  completionRate: number;
  
  // Comments and quality
  assessmentsWithComments: number;
  commentCoverageRate: number;
  averageCommentsPerAssessment: number;
  
  // Performance metrics
  highPerformingLocations: number;
  lowPerformingLocations: number;
  improvementTrend: 'up' | 'down' | 'stable';
  
  // User activity
  activeUsers: number;
  inactiveUsers: number;
  
  // Recent data
  recentActivity: Array<{
    date: string;
    assessments: number;
    averageScore: number;
  }>;
  
  // Location breakdown
  locationStats: Array<{
    id: number;
    nameAr: string;
    assessments: number;
    averageScore: number;
    lastAssessment: string;
  }>;
}

export default function InteractiveKpiDashboard() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');

  // Check if user is General Manager or Super Admin (can see all companies)
  const isGeneralManager = user?.username === 'hsa_group_admin' || 
                          user?.role === 'super_admin' || 
                          user?.role === 'hsa_group_admin';

  // Initialize default date range (last 30 days) and company selection
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);

    // Auto-select user's company for non-general managers
    if (!isGeneralManager && user?.companyId) {
      setSelectedCompanyId(user.companyId.toString());
    }
  }, [user, isGeneralManager]);

  // Fetch companies (with role-based filtering)
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies/active', user?.id],
    queryFn: async () => {
      const data = await apiRequest('/api/companies/active', 'GET');
      
      // Filter companies based on user role
      let filteredCompanies = data.filter((company: Company) => {
        const isAdminCompany = company.nameAr.includes('الشؤون الإدارية') || 
                              company.nameAr.includes('مدير الشؤون الإدارية');
        return !isAdminCompany && company.isActive;
      });

      // For non-general managers, show only their company
      if (!isGeneralManager && user?.companyId) {
        filteredCompanies = filteredCompanies.filter((company: Company) => 
          company.id === user.companyId
        );
      }

      return filteredCompanies;
    },
    enabled: !!user
  });

  // Fetch users (excluding administrative roles)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users/filtered'],
    queryFn: async () => {
      const data = await apiRequest('/api/users', 'GET');
      
      // Filter out administrative roles
      return data.filter((user: User) => {
        const isAdminRole = user.role === 'admin_affairs_manager' || 
                           user.role === 'company_data_specialist' ||
                           user.fullName?.includes('مدير الشؤون الإدارية') ||
                           user.fullName?.includes('اخصائي بيانات الشركة');
        return !isAdminRole;
      });
    },
    enabled: selectedCompanyId !== 'all'
  });

  // Fetch interactive KPI data
  const { data: kpiData, isLoading, refetch } = useQuery<InteractiveKpiData>({
    queryKey: ['/api/kpi/interactive', selectedCompanyId, selectedUserId, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCompanyId !== 'all') params.append('companyId', selectedCompanyId);
      if (selectedUserId !== 'all') params.append('userId', selectedUserId);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      
      return await apiRequest(`/api/kpi/interactive?${params}`, 'GET');
    },
    enabled: !!dateFrom && !!dateTo
  });

  const handleFilterUpdate = () => {
    refetch();
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">مؤشرات الأداء التفاعلية</h1>
            <p className="text-gray-600">مدير الشؤون الإدارية - لوحة القيادة المتقدمة</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleFilterUpdate} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              تحديث البيانات
            </Button>
          </div>
        </div>

        {/* Interactive Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="dateFrom">من تاريخ</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dateTo">إلى تاريخ</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>الشركة</Label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="select-trigger-solid bg-white border-2 border-gray-300 shadow-sm">
                <SelectValue placeholder="اختر الشركة" />
              </SelectTrigger>
              <SelectContent className="select-content-solid">
                {/* Show "All Companies" only for General Manager */}
                {isGeneralManager && (
                  <SelectItem value="all" className="select-item-solid">
                    جميع الشركات
                  </SelectItem>
                )}
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()} className="select-item-solid">
                    {company.nameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>المستخدم</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="select-trigger-solid bg-white border-2 border-gray-300 shadow-sm">
                <SelectValue placeholder="اختر المستخدم" />
              </SelectTrigger>
              <SelectContent className="select-content-solid">
                <SelectItem value="all" className="select-item-solid">
                  جميع المستخدمين
                </SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()} className="select-item-solid">
                    {user.fullName} ({user.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-yellow-500" />
          <span className="mr-2 text-gray-600">جاري تحميل البيانات...</span>
        </div>
      ) : kpiData ? (
        <>
          {/* Main KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">إجمالي التقييمات</CardTitle>
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{kpiData.totalAssessments}</div>
                <Badge variant="secondary" className="mt-2">
                  {kpiData.assessmentsInPeriod} في الفترة المحددة
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">متوسط النقاط</CardTitle>
                <Target className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {kpiData.averageScore ? `${kpiData.averageScore.toFixed(1)}%` : '0%'}
                </div>
                <div className="flex items-center mt-2">
                  {getTrendIcon(kpiData.improvementTrend)}
                  <span className="text-sm text-gray-600 mr-1">اتجاه الأداء</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">معدل التعليقات</CardTitle>
                <MessageSquare className="h-5 w-5 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {kpiData.commentCoverageRate}%
                </div>
                <Badge variant="outline" className="mt-2">
                  {kpiData.assessmentsWithComments} تقييم مع تعليقات
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">معدل الإنجاز</CardTitle>
                <CheckCircle className="h-5 w-5 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {kpiData.completionRate}%
                </div>
                <Badge variant={kpiData.completionRate > 80 ? "default" : "destructive"} className="mt-2">
                  {kpiData.completionRate > 80 ? 'ممتاز' : 'يحتاج تحسين'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Activity Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-yellow-500" />
                  إحصائيات المواقع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>إجمالي المواقع</span>
                    <span className="font-semibold">{kpiData.totalLocations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>مواقع عالية الأداء</span>
                    <span className="font-semibold text-green-600">{kpiData.highPerformingLocations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>مواقع تحتاج تحسين</span>
                    <span className="font-semibold text-red-600">{kpiData.lowPerformingLocations}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  نشاط المستخدمين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>إجمالي المستخدمين</span>
                    <span className="font-semibold">{kpiData.totalUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>مستخدمين نشطين</span>
                    <span className="font-semibold text-green-600">{kpiData.activeUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>مستخدمين غير نشطين</span>
                    <span className="font-semibold text-orange-600">{kpiData.inactiveUsers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  جودة التقييمات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>متوسط التعليقات</span>
                    <span className="font-semibold">{kpiData.averageCommentsPerAssessment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>تغطية التعليقات</span>
                    <span className="font-semibold text-purple-600">{kpiData.commentCoverageRate}%</span>
                  </div>
                  <Badge variant={kpiData.commentCoverageRate > 70 ? "default" : "secondary"} className="w-full justify-center">
                    {kpiData.commentCoverageRate > 70 ? 'جودة ممتازة' : 'جودة جيدة'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>اتجاه النشاط خلال الفترة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={kpiData.recentActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="assessments" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Location Performance */}
            <Card>
              <CardHeader>
                <CardTitle>أداء المواقع</CardTitle>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                <div className="space-y-3">
                  {kpiData.locationStats.map((location) => (
                    <div key={location.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{location.nameAr}</p>
                        <p className="text-sm text-gray-600">
                          {location.assessments} تقييم - آخر تقييم: {location.lastAssessment}
                        </p>
                      </div>
                      <Badge variant={location.averageScore > 80 ? "default" : location.averageScore > 60 ? "secondary" : "destructive"}>
                        {location.averageScore}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد بيانات</h3>
            <p className="text-gray-500">يرجى التأكد من الفلاتر المحددة وتواجد البيانات في النظام</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}