/**
 * زر سريع للوصول إلى نظام التوحيد النهائي
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink,
  Zap,
  Shield
} from 'lucide-react';
import { FinalStorageUnification } from '../lib/final-storage-unification';
import { ForceUnification } from '../lib/force-unification';

export function QuickUnificationButton() {
  const [isChecking, setIsChecking] = useState(false);
  const [systemStatus, setSystemStatus] = useState<{
    isUnified: boolean;
    hasConflicts: boolean;
    message: string;
  } | null>(null);
  
  const checkSystemStatus = () => {
    setIsChecking(true);
    
    try {
      const isUnified = FinalStorageUnification.isUnified();
      const hasConflicts = ForceUnification.hasConflictingSystems();
      
      let message = '';
      if (isUnified && !hasConflicts) {
        message = 'النظام موحد وعمل بصورة مثالية';
      } else if (!isUnified && hasConflicts) {
        message = 'توجد أنظمة متضاربة تحتاج توحيد فوري';
      } else if (!isUnified) {
        message = 'النظام يحتاج إلى توحيد';
      } else {
        message = 'توجد بعض المشاكل الطفيفة';
      }
      
      setSystemStatus({
        isUnified,
        hasConflicts,
        message
      });
    } catch (error) {
      setSystemStatus({
        isUnified: false,
        hasConflicts: true,
        message: `خطأ في فحص النظام: ${error}`
      });
    } finally {
      setIsChecking(false);
    }
  };
  
  const goToUnificationDashboard = () => {
    window.open('/final-unification', '_blank');
  };
  
  const forceQuickUnification = async () => {
    setIsChecking(true);
    try {
      await ForceUnification.forceUnificationOnStartup();
      checkSystemStatus();
    } catch (error) {
      console.error('خطأ في التوحيد السريع:', error);
    } finally {
      setIsChecking(false);
    }
  };
  
  React.useEffect(() => {
    // فحص تلقائي عند التحميل
    checkSystemStatus();
  }, []);
  
  const getStatusColor = () => {
    if (!systemStatus) return 'text-gray-500';
    if (systemStatus.isUnified && !systemStatus.hasConflicts) return 'text-green-600';
    if (systemStatus.hasConflicts) return 'text-red-600';
    return 'text-yellow-600';
  };
  
  const getStatusIcon = () => {
    if (!systemStatus) return <Database className="h-4 w-4" />;
    if (systemStatus.isUnified && !systemStatus.hasConflicts) return <CheckCircle className="h-4 w-4" />;
    if (systemStatus.hasConflicts) return <AlertCircle className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };
  
  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2" dir="rtl">
      {/* شارة حالة النظام */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-3 max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className={getStatusColor()}>
            {getStatusIcon()}
          </div>
          <span className="text-sm font-medium">حالة التوحيد</span>
          <Badge 
            variant={systemStatus?.isUnified && !systemStatus?.hasConflicts ? 'default' : 'destructive'}
            className="text-xs"
          >
            {systemStatus?.isUnified && !systemStatus?.hasConflicts ? 'موحد' : 'محتاج توحيد'}
          </Badge>
        </div>
        
        {systemStatus && (
          <p className="text-xs text-muted-foreground mb-3">
            {systemStatus.message}
          </p>
        )}
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={checkSystemStatus}
            disabled={isChecking}
            className="text-xs"
          >
            {isChecking ? 'فحص...' : 'فحص'}
          </Button>
          
          {systemStatus && systemStatus.hasConflicts && (
            <Button
              size="sm"
              variant="destructive"
              onClick={forceQuickUnification}
              disabled={isChecking}
              className="text-xs"
            >
              <Zap className="h-3 w-3 mr-1" />
              توحيد سريع
            </Button>
          )}
          
          <Button
            size="sm"
            onClick={goToUnificationDashboard}
            className="text-xs bg-yellow-600 hover:bg-yellow-700"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            لوحة التحكم
          </Button>
        </div>
      </div>
      
      {/* تنبيه عند وجود مشاكل */}
      {systemStatus && systemStatus.hasConflicts && (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-900/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>تحذير:</strong> توجد أنظمة تخزين متضاربة تؤثر على أداء النظام.
            يُنصح بتنفيذ التوحيد فوراً.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}