import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  BarChart3,
  Calendar,
  Settings,
  Search,
  Plus,
  Eye,
  Activity,
  Star
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface CompanyStats {
  id: number;
  nameAr: string;
  nameEn: string;
  status: string;
  type: string;
  totalUsers: number;
  totalLocations: number;
  totalChecklists: number;
  completionRate: number;
  averageRating: number;
  lastActivity: string;
}

export default function SuperAdminDashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // التحقق من صلاحيات Super Admin
  if (!loading && user?.role !== "super_admin") {
    setLocation("/");
    return null;
  }

  // استعلام إحصائيات جميع الشركات
  const { data: companiesStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["/api/admin/companies-stats"],
    enabled: user?.role === "super_admin"
  });

  // استعلام الإحصائيات العامة
  const { data: apiOverallStats } = useQuery({
    queryKey: ["/api/admin/overall-stats"],
    enabled: user?.role === "super_admin"
  });

  if (loading || isStatsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">جارٍ تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  // تصفية الشركات المحسنة
  const filteredCompanies = useMemo(() => {
    const companies = companiesStats as CompanyStats[] || [];
    let filtered = companies;
    
    // تصفية حسب البحث
    if (searchTerm) {
      filtered = filtered.filter((company: CompanyStats) => 
        company.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.nameEn.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // تصفية حسب الحالة
    if (statusFilter !== "all") {
      filtered = filtered.filter((company: CompanyStats) => 
        company.status === statusFilter
      );
    }
    
    return filtered;
  }, [companiesStats, searchTerm, statusFilter]);

  // حساب الإحصائيات الإجمالية المحسنة
  const overallStats = useMemo(() => {
    const companies = companiesStats as CompanyStats[] || [];
    if (companies.length === 0) return null;
    
    return {
      totalCompanies: companies.length,
      activeCompanies: companies.filter((c: CompanyStats) => c.status === 'active').length,
      totalUsers: companies.reduce((sum: number, c: CompanyStats) => sum + c.totalUsers, 0),
      totalLocations: companies.reduce((sum: number, c: CompanyStats) => sum + c.totalLocations, 0),
      totalChecklists: companies.reduce((sum: number, c: CompanyStats) => sum + c.totalChecklists, 0),
      averageCompletion: Math.round(companies.reduce((sum: number, c: CompanyStats) => sum + c.completionRate, 0) / companies.length),
      averageRating: companies.reduce((sum: number, c: CompanyStats) => sum + c.averageRating, 0) / companies.length
    };
  }, [companiesStats]);

  // دالة مساعدة لتحديد حالة الأداء
  const getPerformanceStatus = (rate: number) => {
    if (rate >= 90) return { status: "excellent", color: "text-green-600", bg: "bg-green-50" };
    if (rate >= 75) return { status: "good", color: "text-blue-600", bg: "bg-blue-50" };
    if (rate >= 60) return { status: "fair", color: "text-yellow-600", bg: "bg-yellow-50" };
    return { status: "poor", color: "text-red-600", bg: "bg-red-50" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header المحسن */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                الشؤون الإدارية الإدارة العامة
              </h1>
              <p className="text-gray-600">لوحة التحكم الرئيسية - إدارة جميع الشركات</p>
              {overallStats && (
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                  <span>إجمالي {overallStats.totalCompanies} شركة</span>
                  <span>•</span>
                  <span>{overallStats.activeCompanies} شركة نشطة</span>
                  <span>•</span>
                  <span>آخر تحديث: {new Date().toLocaleDateString('ar-EG', { calendar: 'gregory' })}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" className="gap-2 bg-yellow-400 hover:bg-yellow-500 text-black">
                <Plus className="h-4 w-4" />
                إضافة شركة
              </Button>
            </div>
          </div>
        </div>

        {/* الإحصائيات الرئيسية */}
        {overallStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">إجمالي الشركات</p>
                    <p className="text-2xl font-bold text-gray-900">{overallStats.totalCompanies}</p>
                    <p className="text-xs text-gray-600">{overallStats.activeCompanies} شركة نشطة</p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center"><Building2 className="h-5 w-5 text-black" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">إجمالي المستخدمين</p>
                    <p className="text-2xl font-bold text-gray-900">{overallStats.totalUsers.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">عبر جميع الشركات</p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center"><Users className="h-5 w-5 text-black" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">إجمالي المواقع</p>
                    <p className="text-2xl font-bold text-gray-900">{overallStats.totalLocations}</p>
                    <p className="text-xs text-gray-600">موقع مُدار</p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center"><Activity className="h-5 w-5 text-black" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">معدل الإنجاز</p>
                    <p className="text-2xl font-bold text-gray-900">{overallStats.averageCompletion}%</p>
                    <p className="text-xs text-gray-600">متوسط عام</p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center"><TrendingUp className="h-5 w-5 text-black" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">متوسط التقييم</p>
                    <p className="text-2xl font-bold text-orange-900">{overallStats.averageRating.toFixed(1)}</p>
                    <p className="text-xs text-orange-600">من 4.0 نجوم</p>
                  </div>
                  <Star className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* البحث والتصفية */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="البحث في الشركات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  className="whitespace-nowrap"
                >
                  جميع الشركات
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                  className="whitespace-nowrap"
                >
                  النشطة فقط
                </Button>
                <Button
                  variant={statusFilter === "planned" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("planned")}
                  className="whitespace-nowrap"
                >
                  المخططة
                </Button>
              </div>
            </div>
            {filteredCompanies.length !== (companiesStats as CompanyStats[] || []).length && (
              <div className="mt-3 text-sm text-gray-600">
                عرض {filteredCompanies.length} من أصل {(companiesStats as CompanyStats[] || []).length} شركة
              </div>
            )}
          </CardContent>
        </Card>

        {/* قائمة الشركات المحسنة */}
        <div className="space-y-4">
          {filteredCompanies.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد شركات</h3>
                <p className="text-gray-600">لم يتم العثور على شركات تطابق معايير البحث</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCompanies.map((company: CompanyStats) => {
                const performance = getPerformanceStatus(company.completionRate);
                
                return (
                  <Card key={company.id} className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 bg-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                            {company.nameAr}
                          </CardTitle>
                          <CardDescription className="text-sm text-gray-600">
                            {company.nameEn}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Badge 
                            variant={company.status === "active" ? "default" : "secondary"}
                            className={company.status === "active" ? "bg-green-100 text-green-800" : ""}
                          >
                            {company.status === "active" ? "نشطة" : "مخططة"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* إحصائيات مرئية */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                          <div className="text-lg font-bold text-blue-900">{company.totalUsers}</div>
                          <div className="text-xs text-blue-600">مستخدم</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <Building2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                          <div className="text-lg font-bold text-green-900">{company.totalLocations}</div>
                          <div className="text-xs text-green-600">موقع</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                          <div className="text-lg font-bold text-purple-900">{company.totalChecklists}</div>
                          <div className="text-xs text-purple-600">تقييم</div>
                        </div>
                      </div>

                      {/* مؤشر الأداء */}
                      <div className={`p-3 rounded-lg ${performance.bg}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">مستوى الأداء</span>
                          <span className={`text-sm font-bold ${performance.color}`}>
                            {company.completionRate}%
                          </span>
                        </div>
                        <Progress 
                          value={company.completionRate} 
                          className="h-2"
                        />
                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span className={performance.color}>
                            {performance.status === "excellent" ? "ممتاز" :
                             performance.status === "good" ? "جيد" :
                             performance.status === "fair" ? "مقبول" : "يحتاج تحسين"}
                          </span>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span className="text-gray-600">{company.averageRating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      {/* معلومات إضافية */}
                      <div className="text-xs text-gray-500 border-t pt-3">
                        <div className="flex items-center justify-between">
                          <span>آخر نشاط</span>
                          <span>{company.lastActivity}</span>
                        </div>
                      </div>

                      {/* أزرار الإجراءات */}
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1 gap-2">
                          <Eye className="h-4 w-4" />
                          عرض
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 gap-2">
                          <BarChart3 className="h-4 w-4" />
                          تقارير
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* التنبيهات الذكية */}
        {filteredCompanies.some((c: CompanyStats) => c.completionRate < 60) && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-5 w-5" />
                تنبيهات الأداء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredCompanies
                  .filter((c: CompanyStats) => c.completionRate < 60)
                  .map((company: CompanyStats) => (
                    <div key={company.id} className="flex items-center justify-between p-2 bg-white rounded-md">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium">{company.nameAr}</span>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {company.completionRate}% إنجاز
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}