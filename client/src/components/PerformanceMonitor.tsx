import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Database, Cpu } from 'lucide-react';

interface PerformanceMetrics {
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  uptime: number;
  nodeVersion: string;
  platform: string;
}

interface ClientMemoryInfo {
  used: number;
  total: number;
  limit: number;
}

export function PerformanceMonitor() {
  // تم إخفاء المكون بناءً على طلب المستخدم
  return null;

  // مراقبة ذاكرة المتصفح
  useEffect(() => {
    const monitorClientMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setClientMemory({
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        });
      }
    };

    // قياس زمن تحميل الصفحة
    const measurePageLoad = () => {
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      setPageLoadTime(loadTime);
    };

    monitorClientMemory();
    measurePageLoad();

    const interval = setInterval(monitorClientMemory, 30000); // كل 30 ثانية
    return () => clearInterval(interval);
  }, []);

  // جلب إحصائيات الخادم
  useEffect(() => {
    const fetchServerMetrics = async () => {
      try {
        const response = await fetch('/api/system-metrics');
        if (response.ok) {
          const metrics = await response.json();
          setServerMetrics(metrics);
        }
      } catch (error) {
        console.error('Error fetching server metrics:', error);
      }
    };

    fetchServerMetrics();
    // تقليل التكرار - كل 60 ثانية بدلاً من 10 وفقط عند الاتصال
    const interval = setInterval(() => {
      if (navigator.onLine) {
        fetchServerMetrics();
      }
    }, 60000); // كل دقيقة
    return () => clearInterval(interval);
  }, []);

  const getMemoryStatus = (used: number, total: number) => {
    const percentage = (used / total) * 100;
    if (percentage > 80) return { status: 'critical', color: 'destructive' };
    if (percentage > 60) return { status: 'warning', color: 'secondary' };
    return { status: 'good', color: 'default' };
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* ذاكرة الخادم */}
      {serverMetrics && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ذاكرة الخادم</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {serverMetrics.memory.heapUsed} MB
            </div>
            <Progress 
              value={(serverMetrics.memory.heapUsed / serverMetrics.memory.heapTotal) * 100} 
              className="mt-2"
            />
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>من {serverMetrics.memory.heapTotal} MB</span>
              <Badge variant={getMemoryStatus(serverMetrics.memory.heapUsed, serverMetrics.memory.heapTotal).color as any}>
                {Math.round((serverMetrics.memory.heapUsed / serverMetrics.memory.heapTotal) * 100)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ذاكرة المتصفح */}
      {clientMemory && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ذاكرة المتصفح</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clientMemory.used} MB
            </div>
            <Progress 
              value={(clientMemory.used / clientMemory.total) * 100} 
              className="mt-2"
            />
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>من {clientMemory.total} MB</span>
              <Badge variant={getMemoryStatus(clientMemory.used, clientMemory.total).color as any}>
                {Math.round((clientMemory.used / clientMemory.total) * 100)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* زمن تحميل الصفحة */}
      {pageLoadTime && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">زمن التحميل</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(pageLoadTime / 1000).toFixed(2)}s
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {pageLoadTime < 3000 ? 'ممتاز' : pageLoadTime < 5000 ? 'جيد' : 'بطيء'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* معلومات النظام */}
      {serverMetrics && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معلومات النظام</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUptime(serverMetrics.uptime)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Node.js {serverMetrics.nodeVersion}
            </div>
            <div className="text-xs text-muted-foreground">
              {serverMetrics.platform}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}