import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Loader2, Archive, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CompanyBackupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number;
  companyName: string;
}

export function CompanyBackupDialog({ 
  isOpen, 
  onClose, 
  companyId, 
  companyName 
}: CompanyBackupDialogProps) {
  const { toast } = useToast();
  const [backupType, setBackupType] = useState<'full' | 'partial'>('full');
  const [includeEvaluations, setIncludeEvaluations] = useState(true);
  const [includeUsers, setIncludeUsers] = useState(true);
  const [dateRange, setDateRange] = useState<{
    startDate?: Date;
    endDate?: Date;
  }>({});
  const [downloadFormat, setDownloadFormat] = useState<'excel' | 'json'>('excel');

  // استعلام إحصائيات الشركة
  const { data: companyStats } = useQuery({
    queryKey: ['/api/admin/companies', companyId, 'stats'],
    enabled: isOpen
  });

  // إنشاء النسخة الاحتياطية
  const createBackupMutation = useMutation({
    mutationFn: async (backupConfig: any) => {
      const response = await fetch(`/api/admin/companies/${companyId}/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${
        },
        body: JSON.stringify(backupConfig)
      });
      
      if (!response.ok) {
        throw new Error('فشل في إنشاء النسخة الاحتياطية');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: '✅ تم إنشاء النسخة الاحتياطية',
        description: `تم إنشاء النسخة الاحتياطية لشركة ${companyName} بنجاح`,
      });
      
      // تحميل الملف تلقائياً
      const downloadUrl = `/api/admin/companies/${companyId}/backup/download?format=${downloadFormat}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `backup_${companyName}_${format(new Date(), 'yyyy-MM-dd')}.${downloadFormat === 'excel' ? 'xlsx' : 'json'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onClose();
    },
    onError: (error) => {
      toast({
        title: '❌ فشل في إنشاء النسخة الاحتياطية',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        variant: 'destructive'
      });
    }
  });

  const handleCreateBackup = () => {
    const backupConfig = {
      backupType,
      includeEvaluations,
      includeUsers,
      dateRange: backupType === 'partial' ? dateRange : null
    };

    createBackupMutation.mutate(backupConfig);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Archive className="w-5 h-5 text-blue-600" />
            إنشاء نسخة احتياطية - {companyName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* نوع النسخة الاحتياطية */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">نوع النسخة الاحتياطية</Label>
            <RadioGroup value={backupType} onValueChange={(value: 'full' | 'partial') => setBackupType(value)}>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4" />
                    نسخة احتياطية كاملة
                  </div>
                  <p className="text-sm text-gray-500 mr-6">تشمل جميع البيانات والتقييمات</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    نسخة احتياطية جزئية
                  </div>
                  <p className="text-sm text-gray-500 mr-6">مع تحديد نطاق زمني للتقييمات</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* خيارات البيانات المشمولة */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">البيانات المشمولة</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="include-evaluations" 
                  checked={includeEvaluations}
                  onCheckedChange={(checked) => setIncludeEvaluations(checked === true)}
                />
                <Label htmlFor="include-evaluations" className="cursor-pointer">
                  التقييمات والبيانات التشغيلية
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="include-users" 
                  checked={includeUsers}
                  onCheckedChange={(checked) => setIncludeUsers(checked === true)}
                />
                <Label htmlFor="include-users" className="cursor-pointer">
                  بيانات المستخدمين
                </Label>
              </div>
            </div>
            <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
              ℹ️ المواقع والقوالب يتم تضمينها دائماً في النسخة الاحتياطية
            </p>
          </div>

          {/* نطاق التاريخ للنسخة الجزئية */}
          {backupType === 'partial' && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">نطاق التاريخ للتقييمات</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>من تاريخ</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right font-normal",
                          !dateRange.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.startDate ? (
                          format(dateRange.startDate, "yyyy/MM/dd", { locale: ar })
                        ) : (
                          "اختر التاريخ"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" dir="rtl">
                      <Calendar
                        mode="single"
                        selected={dateRange.startDate}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, startDate: date }))}
                        locale={ar}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>إلى تاريخ</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right font-normal",
                          !dateRange.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.endDate ? (
                          format(dateRange.endDate, "yyyy/MM/dd", { locale: ar })
                        ) : (
                          "اختر التاريخ"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" dir="rtl">
                      <Calendar
                        mode="single"
                        selected={dateRange.endDate}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, endDate: date }))}
                        locale={ar}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {/* تنسيق التحميل */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">تنسيق التحميل</Label>
            <RadioGroup value={downloadFormat} onValueChange={(value: 'excel' | 'json') => setDownloadFormat(value)}>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="cursor-pointer">
                  ملف Excel (.xlsx) - موصى به للمراجعة
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="cursor-pointer">
                  ملف JSON (.json) - للاستيراد التقني
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* معاينة المحتوى */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <Label className="text-base font-semibold mb-2 block">معاينة محتوى النسخة الاحتياطية</Label>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>📍 المواقع: تقديري</div>
              <div>📋 القوالب: تقديري</div>
              {includeUsers && <div>👥 المستخدمين: تقديري</div>}
              {includeEvaluations && <div>📊 التقييمات: تقديري</div>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleCreateBackup}
            disabled={createBackupMutation.isPending}
            className="flex-1"
          >
            {createBackupMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 ml-2" />
                إنشاء وتحميل النسخة الاحتياطية
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={createBackupMutation.isPending}>
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}