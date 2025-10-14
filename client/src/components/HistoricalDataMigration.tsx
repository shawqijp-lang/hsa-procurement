/**
 * Historical Data Migration Component
 * مكون نسخ البيانات التاريخية
 * 
 * Allows users to migrate historical evaluations from PostgreSQL to IndexedDB
 * يتيح للمستخدمين نسخ التقييمات التاريخية من PostgreSQL إلى IndexedDB
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calendar, Database, Download, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { enhancedIndexedDB } from '@/lib/enhancedIndexedDB';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MigrationProgress {
  current: number;
  total: number;
  percentage: number;
}

interface MigrationStatus {
  completed: boolean;
  totalMigrated: number;
  completedAt?: string;
  source?: string;
}

export function HistoricalDataMigration() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress>({ current: 0, total: 0, percentage: 0 });
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({ completed: false, totalMigrated: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load migration status on component mount
  useEffect(() => {
    loadMigrationStatus();
  }, []);

  const loadMigrationStatus = async () => {
    try {
      setIsLoading(true);
      const status = await enhancedIndexedDB.getMigrationStatus();
      setMigrationStatus(status);
    } catch (error: any) {
      console.error('فشل في تحميل حالة الهجرة:', error);
      setError('فشل في تحميل حالة الهجرة');
    } finally {
      setIsLoading(false);
    }
  };

  const startMigration = async (options: { startDate?: string; endDate?: string } = {}) => {
    if (isMigrating) return;

    try {
      setIsMigrating(true);
      setError(null);
      setProgress({ current: 0, total: 0, percentage: 0 });

      console.log('🚀 بدء نسخ البيانات التاريخية...');
      
      toast({
        title: "🔄 بدء نسخ البيانات",
        description: "جاري نسخ البيانات التاريخية من الخادم...",
      });

      const result = await enhancedIndexedDB.migrateHistoricalData({
        ...options,
        batchSize: 500,
        onProgress: (progressData) => {
          setProgress(progressData);
        }
      });

      if (result.success) {
        toast({
          title: "✅ اكتملت نسخ البيانات",
          description: `تم نسخ ${result.migratedCount} تقييم من أصل ${result.totalCount} بنجاح`,
        });
        
        // تحديث حالة الهجرة
        await loadMigrationStatus();
        
      } else {
        throw new Error(result.error || 'فشل في نسخ البيانات');
      }

    } catch (error: any) {
      console.error('❌ خطأ في نسخ البيانات التاريخية:', error);
      setError(error.message || 'فشل في نسخ البيانات التاريخية');
      
      toast({
        title: "❌ خطأ في نسخ البيانات",
        description: error.message || 'فشل في نسخ البيانات التاريخية',
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleMigrateAll = () => {
    startMigration();
  };

  const handleMigrateLastMonth = () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const startDate = format(lastMonth, 'yyyy-MM-dd');
    
    startMigration({ startDate });
  };

  const handleMigrateLastYear = () => {
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    const startDate = format(lastYear, 'yyyy-MM-dd');
    
    startMigration({ startDate });
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto" data-testid="migration-loading">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
            <span className="mr-3">جاري تحميل حالة الهجرة...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="historical-data-migration">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-yellow-600" />
          نسخ البيانات التاريخية
        </CardTitle>
        <CardDescription>
          نسخ التقييمات التاريخية من قاعدة بيانات الخادم (PostgreSQL) إلى قاعدة البيانات المحلية (IndexedDB) لتحسين سرعة التقارير
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Migration Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">حالة الهجرة:</span>
            {migrationStatus.completed ? (
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle className="h-3 w-3 ml-1" />
                مكتملة
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertTriangle className="h-3 w-3 ml-1" />
                غير مكتملة
              </Badge>
            )}
          </div>

          {migrationStatus.completed && (
            <div className="text-sm text-gray-600 space-y-1">
              <div>تم نسخ: {migrationStatus.totalMigrated} تقييم</div>
              {migrationStatus.completedAt && (
                <div>تاريخ الإنجاز: {format(new Date(migrationStatus.completedAt), 'yyyy-MM-dd HH:mm')}</div>
              )}
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        {isMigrating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>التقدم:</span>
              <span>{progress.current} / {progress.total} ({progress.percentage}%)</span>
            </div>
            <Progress value={progress.percentage} className="w-full" data-testid="migration-progress" />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" data-testid="migration-error">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Info Alert */}
        <Alert data-testid="migration-info">
          <Info className="h-4 w-4" />
          <AlertDescription>
            ستتم نسخ البيانات التاريخية من الخادم إلى جهازك المحلي. هذا سيحسن سرعة التقارير ويتيح الوصول إليها بدون اتصال إنترنت.
          </AlertDescription>
        </Alert>
      </CardContent>

      <CardFooter className="flex gap-2 flex-wrap">
        <Button
          onClick={handleMigrateAll}
          disabled={isMigrating}
          className="flex items-center gap-2"
          data-testid="button-migrate-all"
        >
          <Download className="h-4 w-4" />
          {isMigrating ? 'جاري النسخ...' : 'نسخ جميع البيانات'}
        </Button>

        <Button
          onClick={handleMigrateLastMonth}
          disabled={isMigrating}
          variant="outline"
          className="flex items-center gap-2"
          data-testid="button-migrate-last-month"
        >
          <Calendar className="h-4 w-4" />
          نسخ الشهر الماضي
        </Button>

        <Button
          onClick={handleMigrateLastYear}
          disabled={isMigrating}
          variant="outline"
          className="flex items-center gap-2"
          data-testid="button-migrate-last-year"
        >
          <Calendar className="h-4 w-4" />
          نسخ السنة الماضية
        </Button>

        {migrationStatus.completed && (
          <Button
            onClick={loadMigrationStatus}
            variant="ghost"
            className="flex items-center gap-2"
            data-testid="button-refresh-status"
          >
            تحديث الحالة
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}