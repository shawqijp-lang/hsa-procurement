import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Building2, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

// Helper function to get auth token from IndexedDB first, then localStorage
const getAuthTokenSafely = async (): Promise<string | null> => {
  try {
    const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
    const token = await enhancedIndexedDB.getAuthData('auth_token') || 
                  await enhancedIndexedDB.getAuthData('token');
    if (token) {
      console.log('🔑 CompanySelector: استرجاع الرمز من IndexedDB');
      return token as string;
    }
  } catch (error) {
    console.warn('⚠️ CompanySelector: فشل IndexedDB، استخدام localStorage:', error);
  }
  
  // لا يوجد احتياطي localStorage - IndexedDB فقط
  console.warn('⚠️ CompanySelector: لم يتم العثور على رمز في IndexedDB');
  
  return token;
};

interface Company {
  id: number;
  nameAr: string;
  nameEn: string;
  type: string;
  status: string;
}

interface CompanySelectorProps {
  currentUser: any;
  onCompanyChange?: (companyId: number) => void;
}

export function CompanySelector({ currentUser, onCompanyChange }: CompanySelectorProps) {
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);

  // استعلام قائمة الشركات (فقط للـ super_admin)
  const { data: companies, isLoading } = useQuery({
    queryKey: ["/api/companies"],
    enabled: currentUser?.role === "super_admin"
  });

  // إذا لم يكن super_admin، لا تعرض المكون
  if (currentUser?.role !== "super_admin") {
    return null;
  }

  const handleCompanyChange = async (companyId: string) => {
    const id = parseInt(companyId);
    setSelectedCompany(id);
    
    try {
      // حفظ اختيار الشركة في session
      const response = await fetch("/api/admin/set-company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await getAuthTokenSafely()}`
        },
        body: JSON.stringify({ companyId: id })
      });
      
      // إشعار المكون الأب
      onCompanyChange?.(id);
      
      // إعادة تحميل الصفحة لتطبيق السياق الجديد
      window.location.reload();
    } catch (error) {
      console.error("خطأ في تغيير الشركة:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        جارٍ التحميل...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-r border-border">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedCompany?.toString()} onValueChange={handleCompanyChange}>
        <SelectTrigger className="w-[280px] h-8 text-sm">
          <SelectValue placeholder="اختر الشركة" />
        </SelectTrigger>
        <SelectContent>
          {Array.isArray(companies) ? companies.map((company: Company) => (
            <SelectItem key={company.id} value={company.id.toString()}>
              <div className="flex items-center justify-between w-full">
                <span className="text-right">{company.nameAr}</span>
                <div className="flex items-center gap-1 text-xs">
                  {company.status === "active" && (
                    <Check className="h-3 w-3 text-green-500" />
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    company.status === "active" 
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}>
                    {company.status === "active" ? "نشطة" : "مخططة"}
                  </span>
                </div>
              </div>
            </SelectItem>
          )) : []}
        </SelectContent>
      </Select>
    </div>
  );
}