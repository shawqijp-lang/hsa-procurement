import { useState, useEffect } from 'react';
import { Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallCompact() {
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
    <div className="flex items-center justify-center">
      <button
        onClick={handleInstallClick}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium text-sm rounded-lg shadow-md transition-all duration-200 hover:shadow-lg transform hover:scale-105"
      >
        {isIOS ? (
          <>
            <Smartphone className="h-4 w-4" />
            <span>تثبيت التطبيق</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span>تثبيت التطبيق</span>
          </>
        )}
      </button>
    </div>
  );
}