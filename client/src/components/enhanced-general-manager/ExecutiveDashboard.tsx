import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart3,
  MapPin,
  Target,
  Award,
  Calendar,
  Users,
  Activity,
  Globe,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface CompanySummary {
  id: number;
  nameAr: string;
  nameEn: string;
  totalLocations: number;
  completedAssessments: number;
  avgScore: number;
  trend: 'up' | 'down' | 'stable';
  criticalIssues: number;
  lastAssessment: string;
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

interface GroupKPI {
  totalCompanies: number;
  totalLocations: number;
  totalAssessments: number;
  avgGroupScore: number;
  completionRate: number;
  criticalAlerts: number;
  topPerformer: string;
  improvementNeeded: string;
}

interface TrendData {
  month: string;
  score: number;
  assessments: number;
}

interface AlertItem {
  id: number;
  companyName: string;
  locationName: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  priority: number;
}

export default function ExecutiveDashboard() {
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('6months');
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');

  // Fetch active companies for filtering
  const { data: activeCompanies, isLoading: loadingActiveCompanies } = useQuery({
    queryKey: ['/api/companies/active']
  });

  // Fetch group-level data with proper filtering
  const { data: groupKPIs, isLoading: loadingKPIs } = useQuery<GroupKPI>({
    queryKey: ['/api/enhanced-gm/executive/kpis', selectedCompany, timeRange]
  });

  const { data: companiesSummary, isLoading: loadingCompanies } = useQuery<CompanySummary[]>({
    queryKey: ['/api/enhanced-gm/executive/companies-summary', selectedCompany]
  });

  const { data: trendData, isLoading: loadingTrends } = useQuery<TrendData[]>({
    queryKey: ['/api/enhanced-gm/executive/trends', selectedCompany, timeRange]
  });

  const { data: alerts, isLoading: loadingAlerts } = useQuery<AlertItem[]>({
    queryKey: ['/api/enhanced-gm/executive/alerts', selectedCompany]
  });

  // Get active company name for display
  const selectedCompanyName = React.useMemo(() => {
    if (!activeCompanies || selectedCompany === 'all') return 'جميع الشركات';
    const company = activeCompanies.find((c: any) => c.id.toString() === selectedCompany);
    return company ? company.nameAr : 'جميع الشركات';
  }, [activeCompanies, selectedCompany]);

  // Mock data for development (remove in production)
  const mockGroupKPIs: GroupKPI = {
    totalCompanies: 3,
    totalLocations: 26,
    totalAssessments: 247,
    avgGroupScore: 87.5,
    completionRate: 92.3,
    criticalAlerts: 3,
    topPerformer: "الألبان والأغذية الوطنية الحديدة",
    improvementNeeded: "شركة متخصصة في صناعة البسكويت والحلويات"
  };

  const mockCompanies: CompanySummary[] = [
    {
      id: 2,
      nameAr: "الألبان والأغذية الوطنية الحديدة",
      nameEn: "NADFOOD-H",
      totalLocations: 12,
      completedAssessments: 108,
      avgScore: 92.8,
      trend: 'up',
      criticalIssues: 1,
      lastAssessment: "2025-08-09",
      status: 'excellent'
    },
    {
      id: 1,
      nameAr: "الشؤون الإدارية الإستراتيجية",
      nameEn: "Strategic Administrative Affairs",
      totalLocations: 8,
      completedAssessments: 76,
      avgScore: 85.4,
      trend: 'stable',
      criticalIssues: 2,
      lastAssessment: "2025-08-08",
      status: 'good'
    },
    {
      id: 3,
      nameAr: "شركة متخصصة في صناعة البسكويت والحلويات",
      nameEn: "Biscuits & Confectionery Co.",
      totalLocations: 6,
      completedAssessments: 63,
      avgScore: 84.3,
      trend: 'down',
      criticalIssues: 0,
      lastAssessment: "2025-08-07",
      status: 'good'
    }
  ];

  const mockTrends: TrendData[] = [
    { month: 'فبراير', score: 84.2, assessments: 32 },
    { month: 'مارس', score: 86.1, assessments: 38 },
    { month: 'أبريل', score: 88.3, assessments: 41 },
    { month: 'مايو', score: 87.9, assessments: 45 },
    { month: 'يونيو', score: 89.1, assessments: 48 },
    { month: 'يوليو', score: 87.5, assessments: 43 }
  ];

  const mockAlerts: AlertItem[] = [
    {
      id: 1,
      companyName: "الألبان والأغذية الوطنية الحديدة",
      locationName: "مصنع الحليب الرئيسي",
      type: 'critical',
      message: "انخفاض معدل النظافة العامة إلى 75%",
      timestamp: "2025-08-09 14:30",
      priority: 1
    },
    {
      id: 2,
      companyName: "الشؤون الإدارية الإستراتيجية",
      locationName: "المكتب الإداري الرئيسي",
      type: 'warning',
      message: "تأخير في تقييمات الأسبوع الحالي",
      timestamp: "2025-08-09 10:15",
      priority: 2
    }
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800 border-green-200',
      good: 'bg-blue-100 text-blue-800 border-blue-200',
      fair: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      poor: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status as keyof typeof colors] || colors.fair;
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
      default: return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  if (loadingKPIs || loadingCompanies) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">تحميل لوحة القيادة التنفيذية...</p>
        </div>
      </div>
    );
  }

  const kpis = groupKPIs || mockGroupKPIs;
  const companies = companiesSummary || mockCompanies;
  const trends = trendData || mockTrends;
  const alertsList = alerts || mockAlerts;

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 text-white rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center space-x-3 space-x-reverse">
              <Globe className="h-8 w-8" />
              <span>مركز قيادة المجموعة</span>
            </h1>
            <p className="text-slate-200 text-lg">
              لوحة تحكم تنفيذية للإشراف الاستراتيجي على جميع شركات هائل سعيد أنعم وشركاه
            </p>
          </div>
          <div className="hidden md:block">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-2xl font-bold">{kpis.totalCompanies}</div>
                <div className="text-slate-300 text-sm">شركات المجموعة</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-2xl font-bold">{kpis.totalLocations}</div>
                <div className="text-slate-300 text-sm">إجمالي المواقع</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="اختر الشركة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الشركات</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.nameAr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="الفترة الزمنية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">آخر 3 أشهر</SelectItem>
              <SelectItem value="6months">آخر 6 أشهر</SelectItem>
              <SelectItem value="12months">آخر سنة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
          <BarChart3 className="h-4 w-4 mr-2" />
          تقرير تنفيذي
        </Button>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">المعدل العام للمجموعة</p>
                <p className="text-3xl font-bold text-green-600">{kpis.avgGroupScore}%</p>
              </div>
              <Award className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">معدل الإنجاز</p>
                <p className="text-3xl font-bold text-blue-600">{kpis.completionRate}%</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي التقييمات</p>
                <p className="text-3xl font-bold text-purple-600">{kpis.totalAssessments}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">التنبيهات الحرجة</p>
                <p className="text-3xl font-bold text-red-600">{kpis.criticalAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="overview">نظرة شاملة</TabsTrigger>
          <TabsTrigger value="companies">أداء الشركات</TabsTrigger>
          <TabsTrigger value="trends">التحليلات</TabsTrigger>
          <TabsTrigger value="alerts">التنبيهات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 space-x-reverse">
                  <TrendingUp className="h-5 w-5" />
                  <span>اتجاه الأداء العام</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => `شهر ${label}`}
                      formatter={(value: any) => [`${value}%`, 'المعدل']}
                    />
                    <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 space-x-reverse">
                  <Building2 className="h-5 w-5" />
                  <span>توزيع المواقع حسب الشركة</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={companies}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ nameAr, totalLocations }) => `${nameAr}: ${totalLocations}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalLocations"
                    >
                      {companies.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center space-x-2 space-x-reverse">
                  <Award className="h-5 w-5" />
                  <span>أفضل أداء</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-green-900">{kpis.topPerformer}</p>
                <p className="text-green-700 text-sm mt-1">تتفوق باستمرار في جميع المعايير</p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-800 flex items-center space-x-2 space-x-reverse">
                  <TrendingUp className="h-5 w-5" />
                  <span>يحتاج تحسين</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-orange-900">{kpis.improvementNeeded}</p>
                <p className="text-orange-700 text-sm mt-1">فرصة للتطوير والنمو</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="companies" className="mt-6">
          <div className="grid gap-4">
            {companies.map((company) => (
              <Card key={company.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <Building2 className="h-8 w-8 text-gray-500" />
                      <div>
                        <h3 className="text-lg font-semibold">{company.nameAr}</h3>
                        <p className="text-sm text-gray-600">{company.nameEn}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6 space-x-reverse">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">المواقع</p>
                        <p className="text-xl font-bold">{company.totalLocations}</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600">التقييمات</p>
                        <p className="text-xl font-bold">{company.completedAssessments}</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600">المعدل</p>
                        <div className="flex items-center space-x-1 space-x-reverse">
                          <p className="text-xl font-bold">{company.avgScore}%</p>
                          {getTrendIcon(company.trend)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <Badge className={getStatusColor(company.status)}>
                          {company.status === 'excellent' && 'ممتاز'}
                          {company.status === 'good' && 'جيد'}
                          {company.status === 'fair' && 'مقبول'}
                          {company.status === 'poor' && 'يحتاج تحسين'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {company.criticalIssues > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border-r-4 border-red-400 rounded">
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                        <span className="text-red-800 text-sm">
                          {company.criticalIssues} مشكلة تحتاج انتباه فوري
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>تحليل الاتجاهات المتقدم</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="score" fill="#10b981" name="المعدل %" />
                  <Bar yAxisId="right" dataKey="assessments" fill="#3b82f6" name="عدد التقييمات" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <div className="space-y-4">
            {alertsList.map((alert) => (
              <Card key={alert.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4 space-x-reverse">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">{alert.companyName}</h4>
                        <span className="text-xs text-gray-500">{alert.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-600">{alert.locationName}</p>
                      <p className="text-sm mt-1">{alert.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}