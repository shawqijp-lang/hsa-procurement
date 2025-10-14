import { useState, useEffect } from "react";
import { Building, Check, ChevronDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

interface Company {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface CompanyFilterProps {
  userRole?: string;
  username?: string;
  onFilterChange?: (selectedCompanies: number[]) => void;
}

export default function CompanyFilter({ userRole, username, onFilterChange }: CompanyFilterProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  
  // Only show for general manager
  const showFilter = userRole === 'general_manager' || username === 'general_manager';
  
  if (!showFilter) {
    return null;
  }

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        // استرجاع الرمز المميز من IndexedDB فقط
        let token: string | null = null;
        try {
          const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
          token = (await enhancedIndexedDB.getAuthData('auth_token') || 
                   await enhancedIndexedDB.getAuthData('token')) as string | null;
        } catch (error) {
          console.error('❌ فشل في استرجاع الرمز من IndexedDB:', error);
        }
        if (!token) return;
        
        const response = await fetch('/api/companies', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setCompanies(data);
          
          // Initially select all companies
          const allIds = data.map((c: Company) => c.id);
          setSelectedCompanies(allIds);
          
          // Load saved selection from IndexedDB فقط
          let savedCompanies: number[] | null = null;
          
          try {
            const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
            const indexedDBData = await enhancedIndexedDB.getAuthData('generalManagerCompanyFilter');
            if (indexedDBData && Array.isArray(indexedDBData)) {
              savedCompanies = indexedDBData as number[];
            }
          } catch (error) {
            console.error('❌ فشل في استرجاع فلتر الشركات من IndexedDB:', error);
          }
          
          if (savedCompanies && savedCompanies.length > 0) {
            setSelectedCompanies(savedCompanies);
          } else {
            setSelectedCompanies(allIds);
          }
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  useEffect(() => {
    // Notify parent component of filter changes
    if (onFilterChange) {
      onFilterChange(selectedCompanies);
    }
    
    // Trigger global filter change event
    window.dispatchEvent(new CustomEvent('companyFilterChanged', {
      detail: { selectedCompanies }
    }));
  }, [selectedCompanies, onFilterChange]);

  const handleCompanyToggle = (companyId: number) => {
    const newSelection = selectedCompanies.includes(companyId)
      ? selectedCompanies.filter(id => id !== companyId)
      : [...selectedCompanies, companyId];
    
    setSelectedCompanies(newSelection);
    
    // حفظ في IndexedDB فقط
    import('@/lib/enhancedIndexedDB').then(({ enhancedIndexedDB }) => {
      enhancedIndexedDB.saveAuthData('generalManagerCompanyFilter', newSelection).catch((error: any) => {
        console.error('❌ فشل في حفظ فلتر الشركات:', error);
      });
    }).catch((error: any) => {
      console.error('❌ فشل في تحميل قاعدة البيانات المحلية:', error);
    });
  };

  const selectAll = () => {
    const allIds = companies.map(c => c.id);
    setSelectedCompanies(allIds);
    
    // حفظ في IndexedDB فقط
    import('@/lib/enhancedIndexedDB').then(({ enhancedIndexedDB }) => {
      enhancedIndexedDB.saveAuthData('generalManagerCompanyFilter', allIds).catch((error: any) => {
        console.error('❌ فشل في حفظ فلتر الشركات (تحديد الكل):', error);
      });
    }).catch((error: any) => {
      console.error('❌ فشل في تحميل قاعدة البيانات المحلية:', error);
    });
  };

  const clearAll = () => {
    setSelectedCompanies([]);
    
    // حفظ في IndexedDB فقط
    import('@/lib/enhancedIndexedDB').then(({ enhancedIndexedDB }) => {
      enhancedIndexedDB.saveAuthData('generalManagerCompanyFilter', []).catch((error: any) => {
        console.error('❌ فشل في حفظ فلتر الشركات (مسح الكل):', error);
      });
    }).catch((error: any) => {
      console.error('❌ فشل في تحميل قاعدة البيانات المحلية:', error);
    });
  };

  const getSelectedText = () => {
    if (selectedCompanies.length === 0) return 'لا توجد شركات محددة';
    if (selectedCompanies.length === companies.length) return 'جميع الشركات';
    if (selectedCompanies.length === 1) {
      const company = companies.find(c => c.id === selectedCompanies[0]);
      return company?.nameAr || 'شركة واحدة';
    }
    return `${selectedCompanies.length} شركات`;
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled className="min-w-[140px]">
        <Building className="h-4 w-4 ml-2" />
        <span className="text-sm">جاري التحميل...</span>
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="relative min-w-[140px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="text-sm">{getSelectedText()}</span>
          </div>
          <div className="flex items-center gap-1">
            {selectedCompanies.length > 0 && selectedCompanies.length < companies.length && (
              <Badge 
                variant="secondary" 
                className="h-5 w-5 p-0 flex items-center justify-center text-xs bg-brand-yellow text-black"
              >
                {selectedCompanies.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-right">
          <div className="flex items-center justify-between">
            <span>مرشح الشركات</span>
            <Filter className="h-4 w-4" />
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <div className="p-2 space-y-1">
          <div className="flex gap-2 mb-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={selectAll}
              className="flex-1 text-xs"
            >
              تحديد الكل
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearAll}
              className="flex-1 text-xs"
            >
              إلغاء الكل
            </Button>
          </div>
          
          {companies.map((company) => (
            <DropdownMenuCheckboxItem
              key={company.id}
              checked={selectedCompanies.includes(company.id)}
              onCheckedChange={() => handleCompanyToggle(company.id)}
              className="flex items-center gap-3 p-2 cursor-pointer text-right"
            >
              <div className="flex-1">
                <div className="text-sm font-medium">{company.nameAr}</div>
                {company.nameEn && (
                  <div className="text-xs text-gray-500">{company.nameEn}</div>
                )}
              </div>
            </DropdownMenuCheckboxItem>
          ))}
        </div>
        
        <DropdownMenuSeparator />
        
        <div className="p-2 text-xs text-gray-500 text-center">
          {selectedCompanies.length} من {companies.length} شركات محددة
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}