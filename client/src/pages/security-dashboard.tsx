import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Clock, 
  Users, 
  FileX, 
  Lock,
  TrendingUp,
  Activity,
  Search
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface SecurityEvent {
  id: number;
  event_type: string;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  user_id?: number;
  username?: string;
  ip_address: string;
  user_agent?: string;
  endpoint?: string;
  details: Record<string, any>;
  created_at: string;
}

interface SecurityStats {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  uniqueIPs: number;
  uniqueUsers: number;
  topEventTypes: Array<{ event_type: string; count: number }>;
  recentThreats: SecurityEvent[];
}

export default function SecurityDashboard() {
  const [timeRange, setTimeRange] = useState('24');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // جلب إحصائيات الأمان
  const { data: securityStats, isLoading: statsLoading } = useQuery({
    queryKey: ['security-stats', timeRange],
    queryFn: async (): Promise<SecurityStats> => {
      const response = await fetch(`/api/security/stats?hours=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch security stats');
      return response.json();
    },
    refetchInterval: 30000 // تحديث كل 30 ثانية
  });

  // جلب السجلات الأمنية
  const { data: securityLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['security-logs', timeRange, eventTypeFilter, levelFilter, searchTerm],
    queryFn: async (): Promise<SecurityEvent[]> => {
      const params = new URLSearchParams({
        hours: timeRange,
        ...(eventTypeFilter !== 'all' && { eventType: eventTypeFilter }),
        ...(levelFilter !== 'all' && { level: levelFilter }),
        ...(searchTerm && { search: searchTerm })
      });
      
      const response = await fetch(`/api/security/logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch security logs');
      return response.json();
    },
    refetchInterval: 10000 // تحديث كل 10 ثوان
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'LOGIN_SUCCESS': return <Shield className="w-4 h-4 text-green-500" />;
      case 'LOGIN_FAILURE': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'UNAUTHORIZED_ACCESS': return <Lock className="w-4 h-4 text-red-500" />;
      case 'SUSPICIOUS_ACTIVITY': return <Eye className="w-4 h-4 text-orange-500" />;
      case 'RATE_LIMIT_EXCEEDED': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'FILE_UPLOAD_VIOLATION': return <FileX className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const translateEventType = (eventType: string) => {
    const translations: Record<string, string> = {
      'LOGIN_SUCCESS': 'نجح تسجيل الدخول',
      'LOGIN_FAILURE': 'فشل تسجيل الدخول',
      'UNAUTHORIZED_ACCESS': 'وصول غير مصرح',
      'SUSPICIOUS_ACTIVITY': 'نشاط مشبوه',
      'RATE_LIMIT_EXCEEDED': 'تجاوز الحد الأقصى',
      'FILE_UPLOAD_VIOLATION': 'انتهاك رفع الملفات',
      'CSRF_VIOLATION': 'انتهاك CSRF',
      'XSS_ATTEMPT': 'محاولة XSS',
      'SQL_INJECTION_ATTEMPT': 'محاولة SQL Injection'
    };
    return translations[eventType] || eventType;
  };

  if (statsLoading || logsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-right">لوحة مراقبة الأمان</h1>
          <p className="text-gray-600 text-right">مراقبة الأحداث الأمنية والتهديدات</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">آخر ساعة</SelectItem>
              <SelectItem value="24">آخر 24 ساعة</SelectItem>
              <SelectItem value="168">آخر أسبوع</SelectItem>
              <SelectItem value="720">آخر شهر</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي الأحداث</p>
                <p className="text-3xl font-bold">{securityStats?.totalEvents || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">أحداث حرجة</p>
                <p className="text-3xl font-bold text-red-500">{securityStats?.criticalEvents || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">أحداث عالية</p>
                <p className="text-3xl font-bold text-orange-500">{securityStats?.highEvents || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">عناوين IP فريدة</p>
                <p className="text-3xl font-bold">{securityStats?.uniqueIPs || 0}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="logs">سجلات الأحداث</TabsTrigger>
          <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
          <TabsTrigger value="threats">التهديدات الأخيرة</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="بحث في السجلات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="نوع الحدث" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأحداث</SelectItem>
                <SelectItem value="LOGIN_FAILURE">فشل تسجيل الدخول</SelectItem>
                <SelectItem value="UNAUTHORIZED_ACCESS">وصول غير مصرح</SelectItem>
                <SelectItem value="SUSPICIOUS_ACTIVITY">نشاط مشبوه</SelectItem>
                <SelectItem value="FILE_UPLOAD_VIOLATION">انتهاك رفع الملفات</SelectItem>
              </SelectContent>
            </Select>

            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="المستوى" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="CRITICAL">حرج</SelectItem>
                <SelectItem value="HIGH">عالي</SelectItem>
                <SelectItem value="MEDIUM">متوسط</SelectItem>
                <SelectItem value="LOW">منخفض</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Security Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-right">السجلات الأمنية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {securityLogs && securityLogs.length > 0 ? (
                  securityLogs.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        {getEventIcon(event.event_type)}
                        <div>
                          <div className="font-medium text-right">
                            {translateEventType(event.event_type)}
                          </div>
                          <div className="text-sm text-gray-600 text-right">
                            {event.username || 'غير معروف'} • {event.ip_address}
                          </div>
                          {event.endpoint && (
                            <div className="text-xs text-gray-500 text-right">
                              {event.endpoint}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={getLevelBadgeVariant(event.level)}>
                          {event.level}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد أحداث أمنية
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">أكثر الأحداث تكراراً</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityStats?.topEventTypes?.map((stat, index) => (
                  <div key={stat.event_type} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {getEventIcon(stat.event_type)}
                      <span>{translateEventType(stat.event_type)}</span>
                    </div>
                    <Badge variant="outline">{stat.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-right text-red-600">التهديدات الحرجة الأخيرة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityStats?.recentThreats?.filter(t => t.level === 'CRITICAL' || t.level === 'HIGH')
                  .slice(0, 10).map((threat) => (
                  <div
                    key={threat.id}
                    className="flex items-center justify-between p-3 rounded-lg border-l-4 border-red-500 bg-red-50"
                  >
                    <div className="flex items-center gap-3">
                      {getEventIcon(threat.event_type)}
                      <div>
                        <div className="font-medium text-red-800 text-right">
                          {translateEventType(threat.event_type)}
                        </div>
                        <div className="text-sm text-red-600 text-right">
                          IP: {threat.ip_address}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge variant="destructive">{threat.level}</Badge>
                      <div className="text-xs text-red-600 mt-1">
                        {format(new Date(threat.created_at), 'dd/MM HH:mm', { locale: ar })}
                      </div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد تهديدات حرجة حديثة
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}