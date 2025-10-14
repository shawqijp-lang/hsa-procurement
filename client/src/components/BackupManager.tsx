import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Download, Calendar as CalendarIcon, Database, FileSpreadsheet, Clock, CheckCircle, AlertCircle, Settings, PlayCircle, PauseCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface ExportOptions {
  includeLocations: boolean;
  includeTemplates: boolean;
  includeEvaluations: boolean;
  includeUsers: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export default function BackupManager() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportLogs, setExportLogs] = useState<any[]>([]);
  const [dataSize, setDataSize] = useState<any>({ total: 'جاري الحساب...', breakdown: {} });
  const [showAdvancedDialog, setShowAdvancedDialog] = useState(false);
  const [showAutoBackupDialog, setShowAutoBackupDialog] = useState(false);
  const [autoBackupSettings, setAutoBackupSettings] = useState<any>(null);
  const [nextBackupInfo, setNextBackupInfo] = useState<any>({ nextBackup: null, timeRemaining: null });
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeLocations: true,
    includeTemplates: true,
    includeEvaluations: true,
    includeUsers: false
  });
  const [selectedDateRange, setSelectedDateRange] = useState<{
    start: Date | undefined;
    end: Date | undefined;
  }>({
    start: undefined,
    end: undefined
  });
  
  const { toast } = useToast();
  
  useEffect(() => {
    loadExportLogs();
    calculateDataSize();
    loadAutoBackupSettings();
    
    // تحديث معلومات النسخة التالية كل دقيقة
    const interval = setInterval(() => {
      setNextBackupInfo(autoBackupScheduler.getNextBackupInfo());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  const loadExportLogs = () => {
    const logs = exportBackupManager.getExportLogs();
    setExportLogs(logs);
  };
  
  const calculateDataSize = async () => {
    const size = await exportBackupManager.calculateDataSize();
    setDataSize(size);
  };
  
  const loadAutoBackupSettings = () => {
    const settings = autoBackupScheduler.getSettings();
    setAutoBackupSettings(settings);
    setNextBackupInfo(autoBackupScheduler.getNextBackupInfo());
  };
  
  const handleQuickExport = async () => {
    setIsExporting(true);
    try {
      const success = await exportBackupManager.quickExport();
      if (success) {
        toast({
          title: "تم التصدير بنجاح",
          description: "تم تنزيل ملف النسخة الاحتياطية على جهازك",
          variant: "default"
        });
        loadExportLogs();
      } else {
        throw new Error("فشل في التصدير");
      }
    } catch (error) {
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير البيانات",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleAdvancedExport = async () => {
    setIsExporting(true);
    try {
      let options = { ...exportOptions };
      
      // إضافة فلترة التاريخ إذا كانت محددة
      if (selectedDateRange.start && selectedDateRange.end) {
        options.dateRange = {
          start: selectedDateRange.start,
          end: selectedDateRange.end
        };
      }
      
      const success = await exportBackupManager.exportToExcel(options);
      if (success) {
        toast({
          title: "تم التصدير بنجاح",
          description: "تم تنزيل ملف النسخة الاحتياطية المخصصة",
          variant: "default"
        });
        loadExportLogs();
        setShowAdvancedDialog(false);
      } else {
        throw new Error("فشل في التصدير");
      }
    } catch (error) {
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير البيانات",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* العنوان */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">إدارة النسخ الاحتياطية</h1>
        <p className="text-gray-600">
          تصدير ونسخ احتياطي لبيانات النظام بتنسيقات مختلفة
        </p>
      </div>
      
      {/* إحصائيات البيانات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            إحصائيات البيانات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{dataSize.breakdown.locations || 0}</div>
              <div className="text-sm text-gray-600">المواقع</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{dataSize.breakdown.templates || 0}</div>
              <div className="text-sm text-gray-600">القوالب</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{dataSize.breakdown.evaluations || 0}</div>
              <div className="text-sm text-gray-600">التقييمات</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{dataSize.breakdown.users || 0}</div>
              <div className="text-sm text-gray-600">المستخدمين</div>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="text-center">
            <div className="text-lg font-semibold">الحجم الإجمالي: {dataSize.total}</div>
          </div>
        </CardContent>
      </Card>
      
      {/* النسخ التلقائي */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            النسخ الاحتياطي التلقائي
          </CardTitle>
          <CardDescription>
            جدولة تلقائية لإنشاء نسخ احتياطية دورية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {autoBackupSettings?.enabled ? (
                  <PlayCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <PauseCircle className="h-5 w-5 text-gray-400" />
                )}
                <span className="font-medium">
                  {autoBackupSettings?.enabled ? 'مفعّل' : 'معطّل'}
                </span>
              </div>
              <Badge variant={autoBackupSettings?.enabled ? "default" : "secondary"}>
                {autoBackupSettings?.frequency === 'daily' && 'يومي'}
                {autoBackupSettings?.frequency === 'weekly' && 'أسبوعي'}
                {autoBackupSettings?.frequency === 'monthly' && 'شهري'}
              </Badge>
            </div>
            
            {autoBackupSettings?.enabled && nextBackupInfo.nextBackup && (
              <div className="text-sm text-gray-600">
                <div>النسخة التالية: {nextBackupInfo.nextBackup}</div>
                <div>المدة المتبقية: {nextBackupInfo.timeRemaining}</div>
              </div>
            )}
            
            <Dialog open={showAutoBackupDialog} onOpenChange={setShowAutoBackupDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  إعداد النسخ التلقائي
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إعدادات النسخ التلقائي</DialogTitle>
                  <DialogDescription>
                    تخصيص جدولة النسخ الاحتياطية التلقائية
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="autoBackupEnabled"
                      checked={autoBackupSettings?.enabled}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...autoBackupSettings, enabled: !!checked };
                        setAutoBackupSettings(newSettings);
                        autoBackupScheduler.updateSettings({ enabled: !!checked });
                      }}
                    />
                    <Label htmlFor="autoBackupEnabled">تفعيل النسخ التلقائي</Label>
                  </div>
                  
                  {autoBackupSettings?.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label>التكرار</Label>
                        <select 
                          className="w-full p-2 border rounded-md"
                          value={autoBackupSettings.frequency}
                          onChange={(e) => {
                            const newSettings = { ...autoBackupSettings, frequency: e.target.value };
                            setAutoBackupSettings(newSettings);
                            autoBackupScheduler.updateSettings({ frequency: e.target.value as any });
                          }}
                        >
                          <option value="daily">يومي</option>
                          <option value="weekly">أسبوعي</option>
                          <option value="monthly">شهري</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>الوقت</Label>
                        <input 
                          type="time" 
                          className="w-full p-2 border rounded-md"
                          value={autoBackupSettings.time}
                          onChange={(e) => {
                            const newSettings = { ...autoBackupSettings, time: e.target.value };
                            setAutoBackupSettings(newSettings);
                            autoBackupScheduler.updateSettings({ time: e.target.value });
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id="includeEvaluations"
                          checked={autoBackupSettings?.includeEvaluations}
                          onCheckedChange={(checked) => {
                            const newSettings = { ...autoBackupSettings, includeEvaluations: !!checked };
                            setAutoBackupSettings(newSettings);
                            autoBackupScheduler.updateSettings({ includeEvaluations: !!checked });
                          }}
                        />
                        <Label htmlFor="includeEvaluations">تضمين التقييمات</Label>
                      </div>
                    </>
                  )}
                  
                  <Button 
                    onClick={() => {
                      setShowAutoBackupDialog(false);
                      loadAutoBackupSettings();
                    }}
                    className="w-full"
                  >
                    حفظ الإعدادات
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* أزرار التصدير */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* التصدير السريع */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              نسخة احتياطية سريعة
            </CardTitle>
            <CardDescription>
              تصدير جميع البيانات الأساسية (المواقع، القوالب، التقييمات)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleQuickExport}
              disabled={isExporting}
              className="w-full"
              size="lg"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  جاري التصدير...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  تصدير سريع
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        {/* التصدير المتقدم */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              نسخة احتياطية مخصصة
            </CardTitle>
            <CardDescription>
              خيارات متقدمة للتصدير مع فلترة حسب التاريخ والنوع
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={showAdvancedDialog} onOpenChange={setShowAdvancedDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" size="lg">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  خيارات متقدمة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>خيارات التصدير المتقدمة</DialogTitle>
                  <DialogDescription>
                    اختر البيانات التي تريد تصديرها
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* خيارات البيانات */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">نوع البيانات</Label>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id="locations"
                          checked={exportOptions.includeLocations}
                          onCheckedChange={(checked) => 
                            setExportOptions(prev => ({ ...prev, includeLocations: !!checked }))
                          }
                        />
                        <Label htmlFor="locations">المواقع</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id="templates"
                          checked={exportOptions.includeTemplates}
                          onCheckedChange={(checked) => 
                            setExportOptions(prev => ({ ...prev, includeTemplates: !!checked }))
                          }
                        />
                        <Label htmlFor="templates">قوالب التقييم</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id="evaluations"
                          checked={exportOptions.includeEvaluations}
                          onCheckedChange={(checked) => 
                            setExportOptions(prev => ({ ...prev, includeEvaluations: !!checked }))
                          }
                        />
                        <Label htmlFor="evaluations">التقييمات</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id="users"
                          checked={exportOptions.includeUsers}
                          onCheckedChange={(checked) => 
                            setExportOptions(prev => ({ ...prev, includeUsers: !!checked }))
                          }
                        />
                        <Label htmlFor="users">المستخدمين</Label>
                      </div>
                    </div>
                  </div>
                  
                  {/* فلترة التاريخ */}
                  {exportOptions.includeEvaluations && (
                    <div className="space-y-3">
                      <Label className="text-base font-medium">فلترة حسب التاريخ (اختياري)</Label>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              {selectedDateRange.start ? 
                                format(selectedDateRange.start, "dd/MM/yyyy", { locale: ar }) : 
                                "من تاريخ"
                              }
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={selectedDateRange.start}
                              onSelect={(date) => setSelectedDateRange(prev => ({ ...prev, start: date }))}
                              locale={ar}
                            />
                          </PopoverContent>
                        </Popover>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              {selectedDateRange.end ? 
                                format(selectedDateRange.end, "dd/MM/yyyy", { locale: ar }) : 
                                "إلى تاريخ"
                              }
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={selectedDateRange.end}
                              onSelect={(date) => setSelectedDateRange(prev => ({ ...prev, end: date }))}
                              locale={ar}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleAdvancedExport}
                    disabled={isExporting}
                    className="w-full"
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        جاري التصدير...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        تصدير مخصص
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
      
      {/* سجل التصديرات */}
      {exportLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              آخر النسخ الاحتياطية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exportLogs.slice(0, 5).map((log, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="font-medium text-sm">{log.fileName}</div>
                      <div className="text-xs text-gray-600">
                        {new Date(log.timestamp).toLocaleString('ar-EG', { calendar: 'gregory' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {log.dataCount.locations + log.dataCount.templates + log.dataCount.evaluations} عنصر
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* معلومات مساعدة */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">نصائح مهمة</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• يتم تصدير البيانات بتنسيق Excel (.xlsx) سهل القراءة</li>
                <li>• النسخ الاحتياطية تشمل جميع البيانات المحفوظة محلياً</li>
                <li>• يُنصح بعمل نسخة احتياطية أسبوعياً على الأقل</li>
                <li>• احتفظ بالملفات في مكان آمن خارج الجهاز</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}