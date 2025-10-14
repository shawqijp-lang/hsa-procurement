import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  MapPin, 
  ClipboardCheck, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  AlertTriangle,
  BarChart3,
  Filter,
  RefreshCcw,
  Eye,
  Users,
  Target,
  Award,
  Clock,
  MessageSquare,
  CheckCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Types for API responses
interface ActiveCompany {
  id: number;
  nameAr: string;
  nameEn?: string;
  isActive: boolean;
}

interface ExecutiveKPIs {
  totalCompanies: number;
  totalLocations: number;
  totalAssessments: number;
  avgGroupScore: number;
  completionRate: number;
  criticalAlerts: number;
  topPerformer: string;
  improvementNeeded: string;
  recentAssessments: number; // التقييمات من آخر أسبوع
  assessmentsWithComments: number; // التقييمات التي تحتوي على تعليقات
  commentCoverageRate: number; // نسبة التقييمات المع تعليقات
}

interface TrendData {
  month: string;
  score: number;
  assessments: number;
  commentsCount?: number; // عدد التعليقات في الشهر
}

interface CompanySummary {
  id: number;
  nameAr: string;
  nameEn?: string;
  totalLocations: number;
  completedAssessments: number;
  avgScore: number;
  trend: 'up' | 'down' | 'stable';
  criticalIssues: number;
  lastAssessment: string;
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

interface Alert {
  id: number;
  companyName: string;
  locationName: string | null;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  priority: number;
}

const ImprovedExecutiveDashboard: React.FC = () => {
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('6months');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  // Fetch active companies
  const { data: activeCompanies, isLoading: loadingCompanies } = useQuery<ActiveCompany[]>({
    queryKey: ['/api/companies/active']
  });

  // Fetch KPIs with company filtering
  const { data: kpis, isLoading: loadingKPIs, refetch: refetchKPIs } = useQuery<ExecutiveKPIs>({
    queryKey: ['/api/enhanced-gm/executive/kpis', selectedCompany, timeRange]
  });

  // Fetch trends
  const { data: trends, isLoading: loadingTrends } = useQuery<TrendData[]>({
    queryKey: ['/api/enhanced-gm/executive/trends', selectedCompany, timeRange]
  });

  // Fetch companies summary
  const { data: companiesSummary, isLoading: loadingCompanySummary } = useQuery<CompanySummary[]>({
    queryKey: ['/api/enhanced-gm/executive/companies-summary', selectedCompany]
  });

  // Fetch alerts
  const { data: alerts, isLoading: loadingAlerts } = useQuery<Alert[]>({
    queryKey: ['/api/enhanced-gm/executive/alerts', selectedCompany]
  });

  const isLoading = loadingCompanies || loadingKPIs || loadingTrends || loadingCompanySummary || loadingAlerts;

  // Get selected company name
  const selectedCompanyName = React.useMemo(() => {
    if (!activeCompanies || selectedCompany === 'all') return 'جميع الشركات';
    const company = activeCompanies.find(c => c.id.toString() === selectedCompany);
    return company ? company.nameAr : 'جميع الشركات';
  }, [activeCompanies, selectedCompany]);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch(trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch(type) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-blue-500" />;
    }
  };

  const refreshAllData = () => {
    refetchKPIs();
    window.location.reload();
  };

  const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-yellow-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">لوحة القيادة التنفيذية</h1>
                <p className="text-sm text-gray-600">
                  {selectedCompanyName} • {timeRange === '3months' ? '3 أشهر' : timeRange === '12months' ? '12 شهر' : '6 أشهر'}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الشركات</SelectItem>
                    {activeCompanies?.map(company => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">3 أشهر</SelectItem>
                  <SelectItem value="6months">6 أشهر</SelectItem>
                  <SelectItem value="12months">12 شهر</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'overview' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('overview')}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  نظرة عامة
                </Button>
                <Button
                  variant={viewMode === 'detailed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('detailed')}
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  تفصيلي
                </Button>
              </div>

              <Button variant="outline" size="sm" onClick={refreshAllData}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">إجمالي الشركات</CardTitle>
              <Building2 className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{kpis?.totalCompanies || 0}</div>
              <Badge variant="secondary" className="mt-2">
                فعالة
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">إجمالي المواقع</CardTitle>
              <MapPin className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{kpis?.totalLocations || 0}</div>
              <Badge variant="secondary" className="mt-2">
                مسجلة
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">إجمالي التقييمات</CardTitle>
              <ClipboardCheck className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{kpis?.totalAssessments || 0}</div>
              <Badge variant="secondary" className="mt-2">
                مكتملة
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">متوسط النقاط</CardTitle>
              <Target className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {kpis?.avgGroupScore ? `${kpis.avgGroupScore.toFixed(1)}%` : '0%'}
              </div>
              <Badge variant="secondary" className="mt-2">
                عام
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* معلومات التعليقات والتحديثات الحديثة */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-cyan-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">تقييمات حديثة</CardTitle>
              <Clock className="h-5 w-5 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{kpis?.recentAssessments || 0}</div>
              <Badge variant="outline" className="mt-2 text-cyan-600 border-cyan-600">
                آخر 7 أيام
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-teal-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">تقييمات مع تعليقات</CardTitle>
              <MessageSquare className="h-5 w-5 text-teal-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{kpis?.assessmentsWithComments || 0}</div>
              <Badge variant="outline" className="mt-2 text-teal-600 border-teal-600">
                مع ملاحظات
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">تغطية التعليقات</CardTitle>
              <CheckCircle className="h-5 w-5 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {kpis?.commentCoverageRate ? `${kpis.commentCoverageRate}%` : '0%'}
              </div>
              <Badge variant="outline" className="mt-2 text-indigo-600 border-indigo-600">
                نسبة التغطية
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                أفضل شركة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-green-600">
                {kpis?.topPerformer || 'غير محدد'}
              </div>
              <p className="text-sm text-gray-600 mt-1">الأداء الأعلى في الفترة المحددة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                تحتاج تحسين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-red-600">
                {kpis?.improvementNeeded || 'غير محدد'}
              </div>
              <p className="text-sm text-gray-600 mt-1">بحاجة إلى تركيز إضافي</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                التنبيهات الحرجة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-red-600">
                {kpis?.criticalAlerts || 0}
              </div>
              <p className="text-sm text-gray-600 mt-1">تتطلب اهتماماً فورياً</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        {viewMode === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>اتجاهات الأداء</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>التنبيهات الحديثة</CardTitle>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                <div className="space-y-3">
                  {alerts?.slice(0, 8).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{alert.companyName}</p>
                        {alert.locationName && (
                          <p className="text-xs text-gray-600">{alert.locationName}</p>
                        )}
                        <p className="text-xs text-gray-700 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
                      </div>
                      <Badge variant={alert.type === 'critical' ? 'destructive' : 'secondary'}>
                        {alert.type === 'critical' ? 'حرج' : alert.type === 'warning' ? 'تحذير' : 'معلومات'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Detailed Companies Summary */}
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل أداء الشركات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right p-3">الشركة</th>
                        <th className="text-right p-3">المواقع</th>
                        <th className="text-right p-3">التقييمات</th>
                        <th className="text-right p-3">متوسط النقاط</th>
                        <th className="text-right p-3">الاتجاه</th>
                        <th className="text-right p-3">الحالة</th>
                        <th className="text-right p-3">آخر تقييم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companiesSummary?.map((company) => (
                        <tr key={company.id} className="border-b">
                          <td className="p-3 font-medium">{company.nameAr}</td>
                          <td className="p-3">{company.totalLocations}</td>
                          <td className="p-3">{company.completedAssessments}</td>
                          <td className="p-3">{company.avgScore.toFixed(1)}%</td>
                          <td className="p-3">{getTrendIcon(company.trend)}</td>
                          <td className="p-3">
                            <Badge className={getStatusColor(company.status)}>
                              {company.status === 'excellent' ? 'ممتاز' : 
                               company.status === 'good' ? 'جيد' :
                               company.status === 'fair' ? 'مقبول' : 'ضعيف'}
                            </Badge>
                          </td>
                          <td className="p-3 text-gray-600">{company.lastAssessment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImprovedExecutiveDashboard;