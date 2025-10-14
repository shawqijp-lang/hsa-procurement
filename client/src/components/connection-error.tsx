import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConnectionErrorProps {
  error: Error;
  onRetry?: () => void;
  className?: string;
}

export function ConnectionError({ error, onRetry, className = "" }: ConnectionErrorProps) {
  const isNetworkError = error.message.includes('خطأ في الاتصال') || 
                         error.message.includes('لا يوجد اتصال') ||
                         error.message.includes('Failed to fetch') ||
                         error.message.includes('timeout');

  const isAuthError = error.message.includes('غير مسموح') ||
                      error.message.includes('401:') ||
                      error.message.includes('403:');

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      <Alert className="max-w-md border-red-500 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="space-y-3">
            <p className="font-medium">
              {isNetworkError ? 'خطأ في الاتصال' : isAuthError ? 'خطأ في التحقق' : 'حدث خطأ'}
            </p>
            <p className="text-sm">
              {error.message}
            </p>
            
            {isNetworkError && (
              <div className="text-xs space-y-1">
                <p>يرجى التحقق من:</p>
                <ul className="list-disc list-inside text-right">
                  <li>الاتصال بالإنترنت</li>
                  <li>إعدادات الشبكة</li>
                  <li>حالة الخادم</li>
                </ul>
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              {onRetry && (
                <Button 
                  size="sm"
                  onClick={onRetry}
                  className="bg-brand-yellow hover:bg-yellow-600 text-black"
                >
                  <RefreshCw className="h-3 w-3 ml-1" />
                  إعادة المحاولة
                </Button>
              )}
              
              <Button 
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                className="border-red-500 text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="h-3 w-3 ml-1" />
                إعادة تحميل الصفحة
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Simplified error message for inline use
export function InlineConnectionError({ error, onRetry }: ConnectionErrorProps) {
  return (
    <div className="text-center py-4">
      <p className="text-red-600 text-sm mb-2">{error.message}</p>
      {onRetry && (
        <Button 
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          <RefreshCw className="h-3 w-3 ml-1" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}