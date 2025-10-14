import { useState, useEffect } from "react";
import { LogOut, User } from "lucide-react";
// import SyncButton from "@/components/offline/SyncButton"; // تم إزالة المزامنة المرئية
// import { usePermissionsSync } from "@/hooks/usePermissionsSync"; // معطل مؤقتاً
import { useAuth } from "@/hooks/useAuth";
import { StableLogoutButton } from "@/components/ui/StableLogoutButton";
import { enhancedIndexedDB } from "@/lib/enhancedIndexedDB";


export default function Header() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [userInfo, setUserInfo] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const { user, isAuthenticated } = useAuth();
  
  // Enable real-time permission sync
  // usePermissionsSync(); // معطل مؤقتاً

  // Update date/time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // ✅ إزالة استدعاء API مكرر - useAuth يحتوي على نفس البيانات
  // Removed duplicate API call - useAuth hook already provides user data

  // 📊 جلب وحفظ بيانات الشركة - نظام ذكي
  useEffect(() => {
    const fetchAndSaveCompanyData = async () => {
      if (!user?.companyId) {
        console.warn('⚠️ [Header] لا يوجد معرف شركة للمستخدم');
        return;
      }

      try {
        // 1️⃣ محاولة جلب من IndexedDB أولاً
        let data = await enhancedIndexedDB.getItem('company_data');
        
        if (data && data.id === user.companyId) {
          setCompanyData(data);
          console.log('✅ [Header] تم جلب بيانات الشركة من IndexedDB:', data);
          return;
        }
        
        // 2️⃣ إذا لم توجد أو مختلفة، نجلب من API ونحفظ
        console.log('🔄 [Header] جلب بيانات الشركة من API...');
        
        const token = await enhancedIndexedDB.getItem('auth_token');
        if (!token) {
          console.warn('⚠️ [Header] لا يوجد token للمصادقة');
          return;
        }

        const response = await fetch('/api/companies', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const companies = await response.json();
          const companyData = companies.find((c: any) => c.id === user.companyId);
          
          if (companyData) {
            const dataToSave = {
              id: companyData.id,
              nameAr: companyData.nameAr,
              nameEn: companyData.nameEn
            };
            
            // حفظ في IndexedDB
            await enhancedIndexedDB.setItem('company_data', dataToSave, 'auth');
            setCompanyData(dataToSave);
            
            console.log('✅ [Header] تم جلب وحفظ بيانات الشركة:', dataToSave);
          } else {
            console.warn('⚠️ [Header] لم يتم العثور على الشركة في الاستجابة');
          }
        } else {
          console.error('❌ [Header] فشل استدعاء API:', response.status);
        }
      } catch (error) {
        console.error('❌ [Header] خطأ في جلب بيانات الشركة:', error);
      }
    };
    
    if (isAuthenticated && user?.companyId) {
      fetchAndSaveCompanyData();
    }
  }, [isAuthenticated, user?.companyId]);

  // Logout handled by LogoutButton component

  return (
    <header className="bg-white text-gray-900 shadow-lg sticky top-0 z-50 border-b border-gray-200">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Title - Mobile Optimized */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-yellow rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-brand-black font-bold text-xs sm:text-sm font-english">HS</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-base md:text-xl font-bold truncate text-gray-900">
                نظام إدارة بيئة العمل {companyData?.nameEn && <span className="text-yellow-600">• {companyData.nameEn}</span>}
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm truncate">
                {companyData?.nameAr || 'هائل سعيد أنعم وشركاه'}
              </p>
            </div>
          </div>
          
          {/* User Info and Actions - Mobile Optimized */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Desktop User Info */}
            <div className="text-xs sm:text-sm text-center hidden md:block">
              <div className="font-medium text-gray-900">{user?.fullName || userInfo?.fullName || 'المستخدم'}</div>
              <div className="text-gray-600">{currentDateTime.toLocaleString('ar-EG', { calendar: 'gregory' })}</div>
              <div className="text-gray-500 text-xs">توقيت محلي</div>
            </div>
            
            {/* Mobile User Info - Compact */}
            <div className="text-xs text-center md:hidden">
              <div className="font-medium truncate max-w-16 sm:max-w-24 text-gray-900">
                {(user?.fullName || userInfo?.fullName || 'المستخدم').split(' ')[0]}
              </div>
              <div className="text-gray-500 text-xs hidden sm:block">
                {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', calendar: 'gregory' })}
              </div>
            </div>
            
            {/* إزالة زر المزامنة لتبسيط الواجهة */}
            
            {/* Stable Logout Button - Unaffected by re-renders */}
            <StableLogoutButton 
              variant="ghost"
              className="text-gray-700 hover:bg-gray-100 p-1.5 sm:p-2 h-8 w-8 sm:h-9 sm:w-9"
              iconOnly={true}
            />
          </div>
        </div>
        
        {/* إزالة زر المزامنة من العرض المحمول */}
      </div>
    </header>
  );
}
