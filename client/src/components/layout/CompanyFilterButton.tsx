import { Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useCompanyFilter } from "@/hooks/useCompanyFilter";

interface Company {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface CompanyFilterButtonProps {
  userRole?: string;
  username?: string;
}

export default function CompanyFilterButton({ userRole, username }: CompanyFilterButtonProps) {
  const { 
    selectedCompanies, 
    isCompanySelected, 
    addCompany, 
    removeCompany, 
    clearSelection, 
    selectAll 
  } = useCompanyFilter();
  
  // فقط مدير عام المجموعة يمكنه رؤية المرشح
  if (userRole !== 'general_manager' && username !== 'general_manager') {
    return null;
  }

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: userRole === 'general_manager' || username === 'general_manager'
  });

  const handleCompanyToggle = (companyId: number) => {
    if (isCompanySelected(companyId)) {
      removeCompany(companyId);
    } else {
      addCompany(companyId);
    }
  };

  const selectedCount = selectedCompanies.length;
  const totalCount = companies.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="relative bg-white hover:bg-gray-50 border-gray-200"
        >
          <Building className="h-4 w-4 ml-2" />
          <span className="text-sm">الشركات</span>
          {selectedCount > 0 && (
            <Badge 
              variant="secondary" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-brand-yellow text-black"
            >
              {selectedCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">مرشح الشركات</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <div className="text-sm text-gray-600 text-right">
            اختر الشركات التي تريد عرض بياناتها ({selectedCount} من {totalCount})
          </div>
          
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-yellow mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {companies.map((company) => (
                <label 
                  key={company.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isCompanySelected(company.id)}
                    onChange={() => handleCompanyToggle(company.id)}
                    className="rounded border-gray-300 text-brand-yellow focus:ring-brand-yellow"
                  />
                  <div className="flex-1 text-right">
                    <div className="font-medium text-sm">{company.nameAr}</div>
                    {company.nameEn && (
                      <div className="text-xs text-gray-500">{company.nameEn}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearSelection}
              className="flex-1"
            >
              إلغاء الكل
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => selectAll(companies.map(c => c.id))}
              className="flex-1"
            >
              تحديد الكل
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}