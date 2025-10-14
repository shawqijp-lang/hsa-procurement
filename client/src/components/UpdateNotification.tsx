import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, RefreshCw, AlertCircle, CheckCircle, Clock, X } from "lucide-react";

interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  updateSize?: string;
  isForced?: boolean;
  updateCompleted?: boolean;
}

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [showCompactNotification, setShowCompactNotification] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');
  
  const { toast } = useToast();

  useEffect(() => {
    const handleUpdateAvailable = (result: UpdateCheckResult) => {
      setUpdateInfo(result);
      setLastCheckTime(new Date().toLocaleTimeString('ar-EG', { calendar: 'gregory' }));
      
      // إذا اكتمل التحديث، إخفاء جميع الإشعارات
      if (result.updateCompleted) {
        setShowUpdateDialog(false);
        setShowCompactNotification(false);
        setUpdateInfo(null);
        
        // إشعار خفيف وسريع للنجاح
        toast({
          title: "✅ تحديث مكتمل",
          description: "التطبيق محدث الآن",
          duration: 2000
        });
        return;
      }
      
      if (result.hasUpdate) {
        if (result.isForced) {
          // تحديث إجباري - حوار مباشر
          setShowUpdateDialog(true);
        } else {
          // تحديث اختياري - إشعار صغير غير مزعج
          setShowCompactNotification(true);
          
          // إخفاء الإشعار تلقائياً بعد 8 ثوان
          setTimeout(() => {
            setShowCompactNotification(false);
          }, 8000);
        }
      }
    };

    smartVersionManager.addUpdateListener(handleUpdateAvailable);

    return () => {
      smartVersionManager.removeUpdateListener(handleUpdateAvailable);
    };
  }, [toast]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setUpdateProgress(0);
    setShowCompactNotification(false);

    try {
      // تحديث سلس مع الحد الأدنى من الإشعارات
      const progressSteps = [
        { step: 25, delay: 500 },
        { step: 50, delay: 300 },
        { step: 75, delay: 400 },
        { step: 100, delay: 300 }
      ];

      for (const progress of progressSteps) {
        setUpdateProgress(progress.step);
        await new Promise(resolve => setTimeout(resolve, progress.delay));
      }

      // تطبيق التحديث الفعلي
      const success = await smartVersionManager.applyUpdate();
      
      if (!success) {
        throw new Error("فشل في تطبيق التحديث");
      }

    } catch (error) {
      console.error('خطأ في التحديث:', error);
      setIsUpdating(false);
      setUpdateProgress(0);
      
      toast({
        title: "فشل التحديث",
        description: "حاول مرة أخرى",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const handleDismissNotification = () => {
    setShowCompactNotification(false);
  };

  return (
    <>
      {/* إشعار مدمج أنيق وغير مزعج */}
      {showCompactNotification && updateInfo && !isUpdating && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-500">
          <div className="bg-gradient-to-r from-yellow-400/95 to-orange-400/95 backdrop-blur-xl border border-yellow-400/30 rounded-2xl shadow-2xl p-4 max-w-sm mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black/20 rounded-full flex items-center justify-center">
                  <Download className="w-5 h-5 text-black" />
                </div>
                <div>
                  <p className="text-black font-bold text-sm">تحديث جديد متاح</p>
                  <p className="text-black/70 text-xs">الإصدار {updateInfo.latestVersion} جاهز</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-black/20 hover:bg-black/30 text-black border-none h-8 px-3 text-xs font-semibold"
                  onClick={() => setShowUpdateDialog(true)}
                >
                  عرض التفاصيل
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-black/20 text-black"
                  onClick={handleDismissNotification}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* حوار التحديث المفصل بتصميم احترافي */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="sm:max-w-md mobile-login-card border-yellow-400/20 backdrop-blur-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-yellow-400 text-lg">
              <div className="w-8 h-8 bg-yellow-400/20 rounded-full flex items-center justify-center">
                <Download className="h-5 w-5 text-yellow-400" />
              </div>
              تحديث جديد متاح
            </DialogTitle>
            <DialogDescription className="text-white/70 mt-2">
              {updateInfo?.isForced ? (
                <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-400/30">
                  <AlertCircle className="w-3 h-3 ml-1" />
                  تحديث إجباري
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30">
                  <CheckCircle className="w-3 h-3 ml-1" />
                  تحديث اختياري
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* معلومات الإصدار */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                <p className="font-medium text-white/60 text-xs mb-2">الإصدار الحالي</p>
                <p className="text-lg font-bold text-white">{updateInfo?.currentVersion}</p>
              </div>
              <div className="bg-yellow-400/10 p-4 rounded-xl border border-yellow-400/20">
                <p className="font-medium text-yellow-400/80 text-xs mb-2">الإصدار الجديد</p>
                <p className="text-lg font-bold text-yellow-400">{updateInfo?.latestVersion}</p>
              </div>
            </div>

            {/* شريط التقدم أثناء التحديث */}
            {isUpdating && (
              <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري التحديث...
                  </span>
                  <span className="text-yellow-400 font-bold">{updateProgress}%</span>
                </div>
                <div className="w-full bg-black/60 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-yellow-400 to-orange-400 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${updateProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* أزرار التحكم */}
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleUpdate}
                disabled={isUpdating}
                className="mobile-btn-primary flex-1"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                    جاري التحديث
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 ml-2" />
                    تحديث الآن
                  </>
                )}
              </Button>
              
              {!updateInfo?.isForced && !isUpdating && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowUpdateDialog(false)}
                  className="border-white/20 text-white hover:bg-white/10 px-6"
                >
                  لاحقاً
                </Button>
              )}
            </div>

            {/* معلومات إضافية */}
            {lastCheckTime && (
              <div className="text-center pt-2 border-t border-white/10">
                <p className="text-xs text-white/40 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  آخر فحص: {lastCheckTime}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}