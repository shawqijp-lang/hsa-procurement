import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check device type
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroidDevice = /Android/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    
    if (!isInstalled) {
      // Listen for the beforeinstallprompt event
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowInstallButton(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // For iOS and Android, show manual install instructions if no prompt
      if ((isIOSDevice || isAndroidDevice) && !isInstalled) {
        setShowInstallButton(true);
      }
      
      // For desktop browsers, always show install option
      if (!isIOSDevice && !isAndroidDevice && !isInstalled) {
        setTimeout(() => setShowInstallButton(true), 2000); // Show after 2 seconds
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallButton(false);
      }
    } else if (isIOS) {
      // Show iOS install instructions
      alert(
        'لتثبيت نظام إدارة بيئة العمل على iPhone/iPad:\n\n' +
        '1. اضغط على زر المشاركة (أسفل الشاشة)\n' +
        '2. اختر "إضافة إلى الشاشة الرئيسية"\n' +
        '3. اضغط "إضافة"\n\n' +
        'سيظهر التطبيق بأيقونة نظام إدارة بيئة العمل على الشاشة الرئيسية'
      );
    } else if (isAndroid) {
      // Show Android install instructions
      alert(
        'لتثبيت نظام إدارة بيئة العمل على Android:\n\n' +
        '1. اضغط على قائمة المتصفح (⋮)\n' +
        '2. اختر "إضافة إلى الشاشة الرئيسية" أو "تثبيت التطبيق"\n' +
        '3. اضغط "إضافة" أو "تثبيت"\n\n' +
        'سيظهر التطبيق كتطبيق منفصل على هاتفك'
      );
    } else {
      // Desktop install instructions
      alert(
        'لتثبيت نظام إدارة بيئة العمل على الكمبيوتر:\n\n' +
        'Chrome: ابحث عن أيقونة "تثبيت" في شريط العنوان\n' +
        'Edge: اضغط على قائمة "..." واختر "التطبيقات" > "تثبيت هذا الموقع كتطبيق"\n' +
        'Firefox: ادخل إلى القائمة واختر "تثبيت"\n\n' +
        'بعد التثبيت، ستجد التطبيق في قائمة التطبيقات'
      );
    }
  };

  if (!showInstallButton) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        onClick={handleInstallClick}
        className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold shadow-lg border-2 border-yellow-300 w-full sm:w-auto"
        size="lg"
      >
        {isIOS ? (
          <>
            <Smartphone className="h-5 w-5 ml-2" />
            تثبيت التطبيق على iPhone/iPad
          </>
        ) : isAndroid ? (
          <>
            <Download className="h-5 w-5 ml-2" />
            تثبيت التطبيق على Android
          </>
        ) : (
          <>
            <Download className="h-5 w-5 ml-2" />
            تثبيت التطبيق على الكمبيوتر
          </>
        )}
      </Button>
      
      {/* Animated indicator */}
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
    </div>
  );
}