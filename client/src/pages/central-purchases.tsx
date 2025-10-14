import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { Building2, Sparkles, FileText, Armchair, Shirt } from 'lucide-react';

interface Company {
  id: number;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  companyId?: number;
}

export default function CentralPurchases() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [userInfo, setUserInfo] = useState<User | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
        const indexedDBUser = await enhancedIndexedDB.getAuthData('user_data') || 
                             await enhancedIndexedDB.getAuthData('user');
        if (indexedDBUser) {
          const userData = typeof indexedDBUser === 'string' ? JSON.parse(indexedDBUser) : indexedDBUser;
          setUserInfo(userData);
          
          if (userData.role === 'admin_affairs_manager' && userData.companyId) {
            setSelectedCompanyId(userData.companyId.toString());
          }
        }
      } catch (error) {
        console.error('فشل في تحميل بيانات المستخدم:', error);
      }
    };

    loadUserData();
  }, []);

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: userInfo?.role === 'enhanced_general_manager' || userInfo?.role === 'admin' || userInfo?.role === 'admin_affairs_manager',
  });

  const isGeneralManager = userInfo?.role === 'enhanced_general_manager';
  const isAffairsManager = userInfo?.role === 'admin_affairs_manager' || userInfo?.role === 'admin';

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Company Filter - Only for General Manager */}
      {isGeneralManager && (
        <div className="flex items-center justify-end gap-3">
          <Building2 className="w-5 h-5 text-gray-600" />
          <Select
            value={selectedCompanyId}
            onValueChange={setSelectedCompanyId}
          >
            <SelectTrigger className="w-[250px] bg-white border-2 border-yellow-400">
              <SelectValue placeholder="اختر الشركة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الشركات</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.nameAr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isAffairsManager && userInfo?.companyId && (
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-300 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-blue-900">
              {companies.find(c => c.id === userInfo.companyId)?.nameAr || `شركة #${userInfo.companyId}`}
            </span>
          </div>
        </div>
      )}

      <div className="py-8">
          {/* Grid of Purchase Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* منظفات */}
            <Card 
              className="border-2 border-blue-300 hover:border-blue-500 transition-all duration-300 hover:shadow-xl cursor-pointer group"
              data-testid="card-cleaners"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    منظفات
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    مواد التنظيف والمنظفات
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* قرطاسية */}
            <Card 
              className="border-2 border-green-300 hover:border-green-500 transition-all duration-300 hover:shadow-xl cursor-pointer group"
              data-testid="card-stationery"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <FileText className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    قرطاسية
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    المستلزمات المكتبية والقرطاسية
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* أثاث */}
            <Card 
              className="border-2 border-purple-300 hover:border-purple-500 transition-all duration-300 hover:shadow-xl cursor-pointer group"
              data-testid="card-furniture"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Armchair className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    أثاث
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    أثاث المكاتب والمرافق
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ملابس عاملين */}
            <Card 
              className="border-2 border-orange-300 hover:border-orange-500 transition-all duration-300 hover:shadow-xl cursor-pointer group"
              data-testid="card-uniforms"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Shirt className="w-10 h-10 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    ملابس عاملين
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    الزي الموحد للعاملين
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

      </div>
    </div>
  );
}
