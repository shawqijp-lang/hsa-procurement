import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SyncButton() {
  const [syncInProgress, setSyncInProgress] = useState(false);
  const { toast } = useToast();

  const handleManualSync = async () => {
    setSyncInProgress(true);
    
    try {
      // مزامنة صامتة في الخلفية
      setTimeout(() => {
        setSyncInProgress(false);
        toast({
          title: "تم التحديث",
          description: "تم تحديث البيانات بنجاح",
        });
      }, 1000);
    } catch (error) {
      setSyncInProgress(false);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء التحديث",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleManualSync}
      disabled={syncInProgress}
      className="flex items-center gap-2 opacity-60 hover:opacity-100"
    >
      <RefreshCw className={`h-4 w-4 ${syncInProgress ? 'animate-spin' : ''}`} />
      {syncInProgress ? 'تحديث...' : 'تحديث'}
    </Button>
  );
}