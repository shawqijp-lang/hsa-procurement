import { useState, useEffect, useCallback } from "react";

export interface CompanyFilterState {
  selectedCompanies: number[];
  isFilterActive: boolean;
}

export function useCompanyFilter() {
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  
  // تحميل الاختيار المحفوظ عند بدء التطبيق - IndexedDB فقط
  useEffect(() => {
    const loadCompanyFilter = async () => {
      try {
        // محاولة استرجاع من IndexedDB أولاً
        const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
        const savedIndexedDB = await enhancedIndexedDB.getAuthData('selectedCompanies');
        
        if (savedIndexedDB) {
          const parsed = typeof savedIndexedDB === 'string' ? JSON.parse(savedIndexedDB) : savedIndexedDB;
          if (Array.isArray(parsed)) {
            setSelectedCompanies(parsed);
            return;
          }
        }
      } catch (error) {
        console.warn('⚠️ فشل في استرجاع فلتر الشركات من IndexedDB:', error);
      }

      // في حالة عدم وجود بيانات، استخدام القيم الافتراضية
      console.log('ℹ️ لا توجد بيانات فلتر شركات محفوظة، بدء بقائمة فارغة');
    };

    loadCompanyFilter();
  }, []);

  // الاستماع لتغييرات المرشح من مكونات أخرى
  useEffect(() => {
    const handleFilterChange = (event: CustomEvent) => {
      const { selectedCompanies: newSelection } = event.detail;
      setSelectedCompanies(newSelection);
    };

    window.addEventListener('companyFilterChanged' as any, handleFilterChange);
    
    return () => {
      window.removeEventListener('companyFilterChanged' as any, handleFilterChange);
    };
  }, []);

  // تحديث اختيار الشركات - حفظ في IndexedDB فقط
  const updateSelectedCompanies = useCallback((companies: number[]) => {
    setSelectedCompanies(companies);
    
    // حفظ في IndexedDB أولاً
    import('@/lib/enhancedIndexedDB').then(({ enhancedIndexedDB }) => {
      enhancedIndexedDB.saveAuthData('selectedCompanies', companies).catch(err => {
        console.warn('⚠️ فشل في حفظ فلتر الشركات في IndexedDB:', err);
        // في حالة فشل IndexedDB، استخدم sessionStorage كاحتياطي مؤقت
        sessionStorage.setItem('selectedCompanies', JSON.stringify(companies));
      });
    }).catch(() => {
      // في حالة فشل تحميل IndexedDB، استخدم sessionStorage مؤقتاً
      sessionStorage.setItem('selectedCompanies', JSON.stringify(companies));
    });
    
    // إشعار المكونات الأخرى بالتغيير
    window.dispatchEvent(new CustomEvent('companyFilterChanged', { 
      detail: { selectedCompanies: companies } 
    }));
  }, []);

  // إضافة شركة للاختيار
  const addCompany = useCallback((companyId: number) => {
    setSelectedCompanies(prev => {
      if (!prev.includes(companyId)) {
        const newSelection = [...prev, companyId];
        updateSelectedCompanies(newSelection);
        return newSelection;
      }
      return prev;
    });
  }, [updateSelectedCompanies]);

  // إزالة شركة من الاختيار
  const removeCompany = useCallback((companyId: number) => {
    setSelectedCompanies(prev => {
      const newSelection = prev.filter(id => id !== companyId);
      updateSelectedCompanies(newSelection);
      return newSelection;
    });
  }, [updateSelectedCompanies]);

  // مسح جميع الاختيارات
  const clearSelection = useCallback(() => {
    updateSelectedCompanies([]);
  }, [updateSelectedCompanies]);

  // تحديد جميع الشركات
  const selectAll = useCallback((allCompanyIds: number[]) => {
    updateSelectedCompanies(allCompanyIds);
  }, [updateSelectedCompanies]);

  // فحص ما إذا كان المرشح نشطاً
  const isFilterActive = selectedCompanies.length > 0;

  // فحص ما إذا كانت شركة محددة مختارة
  const isCompanySelected = useCallback((companyId: number) => {
    return selectedCompanies.includes(companyId);
  }, [selectedCompanies]);

  // الحصول على نص وصفي للمرشح الحالي
  const getFilterDescription = useCallback(() => {
    if (selectedCompanies.length === 0) {
      return 'جميع الشركات';
    }
    if (selectedCompanies.length === 1) {
      return 'شركة واحدة محددة';
    }
    return `${selectedCompanies.length} شركات محددة`;
  }, [selectedCompanies]);

  return {
    selectedCompanies,
    isFilterActive,
    updateSelectedCompanies,
    addCompany,
    removeCompany,
    clearSelection,
    selectAll,
    isCompanySelected,
    getFilterDescription
  };
}