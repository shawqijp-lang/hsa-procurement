/**
 * 🧪 Test User Data in IndexedDB - فحص بيانات المستخدمين في IndexedDB
 * للتحقق من حفظ وعرض بيانات المستخدمين وصلاحياتهم
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { enhancedIndexedDB } from '@/lib/enhancedIndexedDB';
import { useOfflineAuth } from '@/hooks/useOfflineAuth';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Building2, 
  Shield, 
  Database, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  Trash2
} from 'lucide-react';

interface UserData {
  id: number;
  username: string;
  fullName: string;
  role: string;
  companyId: number;
  permissions?: string[];
}

interface CompanyData {
  id: number;
  nameAr: string;
  nameEn?: string;
}

export default function TestUserData() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  
  const { getOfflineUserData, isOffline } = useOfflineAuth();

  // Initialize IndexedDB and load data
  useEffect(() => {
    const initAndLoad = async () => {
      setLoading(true);
      try {
        await enhancedIndexedDB.init();
        setDbStatus('ready');
        await loadAllUserData();
      } catch (error) {
        console.error('❌ فشل في تهيئة IndexedDB:', error);
        setDbStatus('error');
      } finally {
        setLoading(false);
      }
    };
    initAndLoad();
  }, []);

  const loadAllUserData = async () => {
    try {
      // Load user data
      const storedUser = await enhancedIndexedDB.getAuthData('user_data');
      if (storedUser) {
        const user = typeof storedUser === 'string' ? JSON.parse(storedUser) : storedUser;
        setUserData(user);
        console.log('✅ بيانات المستخدم محملة:', user);
      }

      // Load auth token
      const token = await enhancedIndexedDB.getAuthData('auth_token');
      setAuthToken(token);

      // Load company data if user has companyId
      if (storedUser?.companyId) {
        const company = await enhancedIndexedDB.getAuthData(`company_${storedUser.companyId}`);
        if (company) {
          setCompanyData(company);
        }
      }

      // Load offline credentials
      const offlineData = await getOfflineUserData();
      setCredentials(offlineData.userData);

    } catch (error) {
      console.error('❌ فشل في تحميل البيانات:', error);
    }
  };

  const clearAllData = async () => {
    try {
      setLoading(true);
      await enhancedIndexedDB.clear();
      setUserData(null);
      setCompanyData(null);
      setAuthToken(null);
      setCredentials(null);
      console.log('🗑️ تم مسح جميع البيانات');
    } catch (error) {
      console.error('❌ فشل في مسح البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'supervisor': return 'bg-blue-100 text-blue-800';
      case 'مدير بيئة العمل': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    if (dbStatus === 'ready') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (dbStatus === 'error') return <AlertCircle className="w-4 h-4 text-red-600" />;
    return <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="border-2 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Database className="w-6 h-6 text-yellow-600" />
              فحص بيانات المستخدمين في IndexedDB
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="text-sm">
                  حالة النظام: {dbStatus === 'ready' ? 'جاهز' : dbStatus === 'error' ? 'خطأ' : 'جاري التحميل'}
                </span>
              </div>
              <Badge variant={isOffline ? 'destructive' : 'secondary'}>
                {isOffline ? 'غير متصل' : 'متصل'}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Controls */}
        <div className="flex gap-4">
          <Button 
            onClick={loadAllUserData} 
            disabled={loading || dbStatus !== 'ready'}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            إعادة تحميل البيانات
          </Button>
          <Button 
            onClick={clearAllData} 
            disabled={loading || dbStatus !== 'ready'}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            مسح جميع البيانات
          </Button>
        </div>

        {/* User Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              بيانات المستخدم الحالي
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">معرف المستخدم</label>
                    <p className="text-lg font-semibold">{userData.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">اسم المستخدم</label>
                    <p className="text-lg font-semibold">{userData.username}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">الاسم الكامل</label>
                    <p className="text-lg font-semibold">{userData.fullName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">معرف الشركة</label>
                    <p className="text-lg font-semibold">{userData.companyId}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">الدور</label>
                  <div className="mt-1">
                    <Badge className={getRoleColor(userData.role)}>
                      {userData.role}
                    </Badge>
                  </div>
                </div>
                {userData.permissions && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">الصلاحيات</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {userData.permissions.map((permission, index) => (
                        <Badge key={index} variant="outline">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>لا توجد بيانات مستخدم محفوظة</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600" />
              بيانات الشركة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {companyData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">معرف الشركة</label>
                    <p className="text-lg font-semibold">{companyData.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">اسم الشركة (عربي)</label>
                    <p className="text-lg font-semibold">{companyData.nameAr}</p>
                  </div>
                  {companyData.nameEn && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">اسم الشركة (إنجليزي)</label>
                      <p className="text-lg font-semibold">{companyData.nameEn}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>لا توجد بيانات شركة محفوظة</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auth Token */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              رمز المصادقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {authToken ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">رمز JWT</label>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-mono break-all">
                    {authToken.substring(0, 50)}...
                    <span className="text-gray-400">({authToken.length} حرف)</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>لا يوجد رمز مصادقة محفوظ</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offline Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-orange-600" />
              بيانات الوضع المحلي
            </CardTitle>
          </CardHeader>
          <CardContent>
            {credentials ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">اسم المستخدم المحفوظ</label>
                    <p className="text-lg font-semibold">{credentials.username}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">الاسم الكامل</label>
                    <p className="text-lg font-semibold">{credentials.fullName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">الدور</label>
                    <Badge className={getRoleColor(credentials.role)}>
                      {credentials.role}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">معرف الشركة</label>
                    <p className="text-lg font-semibold">{credentials.companyId}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Eye className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>لا توجد بيانات محلية محفوظة</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}