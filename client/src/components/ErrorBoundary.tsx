import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  isOnline: boolean;
  isNetworkError: boolean;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      isOnline: navigator.onLine,
      isNetworkError: false,
      retryCount: 0
    };
  }

  componentDidMount() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOnline: true });
    // إذا كان الخطأ متعلق بالشبكة، جرب إعادة التحميل تلقائياً
    if (this.state.isNetworkError && this.state.retryCount < 3) {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  handleOffline = () => {
    this.setState({ isOnline: false });
  };

  static getDerivedStateFromError(error: Error): State {
    const isNetworkError = 
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('خطأ في الاتصال') ||
      error.message.includes('لا يوجد اتصال') ||
      error.message.includes('timeout') ||
      error.name === 'TypeError' && error.message.includes('fetch');

    return {
      hasError: true,
      error,
      isOnline: navigator.onLine,
      isNetworkError,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // للأخطاء المتعلقة بالشبكة، لا نسجلها كأخطاء خطيرة
    if (!this.isNetworkRelatedError(error)) {
      console.error('🚨 Critical Error:', error, errorInfo);
    } else {
      console.warn('📶 Network related error caught by boundary:', error.message);
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  isNetworkRelatedError = (error: Error): boolean => {
    return (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('خطأ في الاتصال') ||
      error.message.includes('لا يوجد اتصال') ||
      error.message.includes('timeout') ||
      (error.name === 'TypeError' && error.message.includes('fetch'))
    );
  };

  handleReload = () => {
    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1
    }));
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={`min-h-screen flex items-center justify-center px-4 ${
          this.state.isNetworkError ? 'bg-amber-50' : 'bg-gray-50'
        }`}>
          <div className="max-w-md w-full text-center">
            {/* رمز التحذير */}
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            {/* العنوان */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {this.state.isNetworkError ? 'مشكلة في الاتصال' : 'حدث خطأ غير متوقع'}
            </h1>
            
            {/* الوصف */}
            <p className="text-gray-600 mb-4">
              {this.state.isNetworkError 
                ? 'يبدو أن هناك مشكلة في الاتصال بالإنترنت. التطبيق سيعمل في الوضع المحلي.' 
                : 'عذراً، حدث خطأ تقني في التطبيق. يرجى إعادة تحميل الصفحة أو المحاولة لاحقاً.'}
            </p>
            
            {/* مؤشر حالة الاتصال */}
            <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-lg bg-gray-100">
              {this.state.isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">متصل بالإنترنت</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-600">غير متصل - الوضع المحلي نشط</span>
                </>
              )}
            </div>
            
            {/* الأزرار */}
            <div className="space-y-3">
              {this.state.isNetworkError ? (
                <>
                  {this.state.isOnline && (
                    <Button 
                      onClick={this.handleRetry}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <RefreshCw className="w-4 h-4 ml-2" />
                      المتابعة في الوضع العادي
                    </Button>
                  )}
                  
                  <Button 
                    onClick={this.handleGoHome}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    <Home className="w-4 h-4 ml-2" />
                    العودة للصفحة الرئيسية
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={this.handleReload}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    <RefreshCw className="w-4 h-4 ml-2" />
                    إعادة تحميل الصفحة
                  </Button>
                  
                  <Button 
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="w-full"
                  >
                    <Home className="w-4 h-4 ml-2" />
                    المحاولة مرة أخرى
                  </Button>
                </>
              )}
            </div>
            
            {/* رسالة طمأنة للمستخدم */}
            {this.state.isNetworkError && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-2">💡 معلومة مفيدة:</div>
                  <p>جميع بياناتك محفوظة محلياً وستتم المزامنة تلقائياً عند عودة الاتصال.</p>
                </div>
              </div>
            )}
            
            {/* معلومات الخطأ للمطورين في وضع التطوير */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  تفاصيل الخطأ (للمطورين)
                </summary>
                <div className="mt-2 p-4 bg-red-50 rounded border border-red-200 text-xs font-mono text-red-800 overflow-auto max-h-40">
                  <div className="font-bold mb-2">Network Error: {String(this.state.isNetworkError)}</div>
                  <div className="font-bold mb-2">Online: {String(this.state.isOnline)}</div>
                  <div className="font-bold mb-2">Retry Count: {this.state.retryCount}</div>
                  <div className="font-bold mb-2">Error:</div>
                  <div className="mb-4">{this.state.error.message}</div>
                  <div className="font-bold mb-2">Stack:</div>
                  <div className="whitespace-pre-wrap">{this.state.error.stack}</div>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}