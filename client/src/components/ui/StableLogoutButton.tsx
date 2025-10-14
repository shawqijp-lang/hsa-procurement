import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";

interface StableLogoutButtonProps {
  variant?: 'ghost' | 'outline' | 'destructive' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  iconOnly?: boolean;
  title?: string;
}

/**
 * Stable logout button that is NOT affected by useAuth re-renders or state changes.
 * Uses direct API calls and browser navigation to ensure logout always works.
 * 
 * This solves the race condition issue where logout button becomes unresponsive
 * after save operations due to useAuth hook re-initialization.
 */
export function StableLogoutButton({
  variant = 'ghost',
  size = 'sm', 
  className = '',
  iconOnly = true,
  title = 'تسجيل الخروج'
}: StableLogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [, setLocation] = useLocation();
  const { logout } = useAuth();

  // Unified logout function that works with the enhanced auth system
  const handleConfirmedLogout = useCallback(async () => {
    console.log('🚪 بدء عملية الخروج الموحدة... [VERSION 2.0]');
    console.log('🎯 النسخة الجديدة من StableLogoutButton تعمل الآن!');
    setIsLoggingOut(true);
    
    try {
      // 1. استخدام النظام الموحد للخروج
      console.log('🔄 تفعيل النظام الموحد للخروج...');
      console.log('🎯 استدعاء logout function من useAuth...');
      await logout();
      
      console.log('✅ تم تسجيل الخروج عبر النظام الموحد');
      
    } catch (error) {
      console.error('❌ فشل النظام الموحد، التبديل للنظام التقليدي...');
      
      // Fallback: النظام التقليدي
      try {
        const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
        await enhancedIndexedDB.saveAppState('explicit_logout', 'true');
        
        // حفظ البيانات المحلية قبل المسح
        const userData = await enhancedIndexedDB.getItem('auth_user');
        if (userData) {
          const user = typeof userData === 'string' ? JSON.parse(userData) : userData;
          if (user.username) {
            await enhancedIndexedDB.setItem('auth_username', user.username, 'auth');
            console.log('✅ حفظ احتياطي لاسم المستخدم:', user.username);
          }
          if (user.companyId) {
            await enhancedIndexedDB.setItem('auth_company', user.companyId.toString(), 'auth');
            console.log('✅ حفظ احتياطي لمعرف الشركة:', user.companyId);
          }
        }
        
        // مسح بيانات الجلسة
        await enhancedIndexedDB.removeItem('auth_token');
        await enhancedIndexedDB.removeItem('offline_credentials');
        
        // استدعاء API
        fetch('/api/auth/logout', { 
          method: 'POST',
          credentials: 'include'
        }).catch(() => {});
        
        console.log('🧹 تم الخروج عبر النظام الاحتياطي');
        
      } catch (fallbackError) {
        console.error('❌ فشل كامل في عملية الخروج:', fallbackError);
      }
      
      // إعادة تحميل في جميع الأحوال
      window.location.reload();
    }
  }, [logout]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isLoggingOut}
          className={`${className} disabled:opacity-50`}
          title={title}
          data-testid="stable-logout-button"
        >
          <LogOut className={iconOnly ? 'h-4 w-4' : 'h-4 w-4 ml-2'} />
          {!iconOnly && <span>تسجيل الخروج</span>}
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent data-testid="stable-logout-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>تأكيد تسجيل الخروج</AlertDialogTitle>
          <AlertDialogDescription>
            هل أنت متأكد من تسجيل الخروج؟ 
            <br />
            سيتم إنهاء جلستك الحالية وإعادة توجيهك إلى صفحة تسجيل الدخول.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoggingOut}>
            إلغاء
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmedLogout}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            disabled={isLoggingOut}
            data-testid="stable-logout-confirm"
          >
            {isLoggingOut ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2" />
                جارٍ تسجيل الخروج...
              </>
            ) : (
              'نعم، تسجيل الخروج'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}