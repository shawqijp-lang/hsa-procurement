import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { resetIndexedDB } from '@/utils/dbReset';
import { unifiedLocalDatabase } from '@/lib/enhancedIndexedDB';
import { useToast } from '@/hooks/use-toast';

export function DatabaseResetButton() {
  const { toast } = useToast();

  const handleResetDatabase = async () => {
    const confirm = window.confirm('هل أنت متأكد من رغبتك في مسح جميع البيانات المحلية؟ هذا الإجراء لا يمكن التراجع عنه.');
    
    if (!confirm) return;

    try {
      toast({
        title: "🔄 جاري إعادة تعيين قاعدة البيانات",
        description: "يرجى الانتظار...",
      });
      
      await resetIndexedDB();
      await unifiedLocalDatabase.ensureDatabase();
      
      toast({
        title: "✅ تم إعادة تعيين قاعدة البيانات",
        description: "تم مسح جميع البيانات المحلية وإعادة إنشاء قاعدة البيانات",
      });
      
      // إعادة تحميل الصفحة لضمان حالة نظيفة
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('فشل في إعادة تعيين قاعدة البيانات:', error);
      toast({
        title: "❌ فشل في إعادة التعيين",
        description: "لم يتم إعادة تعيين قاعدة البيانات. جرب إعادة تحميل الصفحة.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button 
      onClick={handleResetDatabase}
      variant="destructive"
      size="sm"
      className="flex items-center gap-2"
    >
      <RotateCcw className="h-4 w-4" />
      إعادة تعيين قاعدة البيانات
    </Button>
  );
}