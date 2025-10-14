import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/ui/loading-spinner";

import { 
  Building, 
  Home, 
  Stethoscope, 
  ChefHat, 
  Package, 
  Droplets, 
  MapPin, 
  Utensils,
  Hospital,
  Store,
  Factory,
  Warehouse,
  TreePine,
  Save,
  RotateCcw,
  Users,
  User
} from "lucide-react";

interface Location {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
}

interface AssessmentLocationPermission {
  locationId: number;
  isEnabled: boolean;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
}

interface UserLocationPermission {
  userId: number;
  locationId: number;
  isEnabled: boolean;
}

const iconMap = {
  building: Building,
  home: Home,
  'clinic-medical': Stethoscope,
  'chef-hat': ChefHat,
  package: Package,
  droplets: Droplets,
  'map-pin': MapPin,
  utensils: Utensils,
  hospital: Hospital,
  store: Store,
  factory: Factory,
  warehouse: Warehouse,
  'tree-pine': TreePine,
};

export default function AssessmentLocations() {
  const [userPermissions, setUserPermissions] = useState<Record<number, Record<number, boolean>>>({});
  const [selectedUser, setSelectedUser] = useState<string>("14"); // Default to first user
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Enhanced locations fetching with IndexedDB fallback
  const { data: locations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: currentUser?.role === 'user' ? ['/api/user/my-locations'] : ['/api/locations'],
    queryFn: async () => {
      const endpoint = currentUser?.role === 'user' ? '/api/user/my-locations' : '/api/locations';
      
      try {
        // First try API
        if (navigator.onLine) {
          const data = await apiRequest(endpoint, 'GET');
          // Cache in IndexedDB for offline use
          try {
            const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
            if (data && Array.isArray(data)) {
              for (const location of data) {
                await enhancedIndexedDB.saveLocation(location);
              }
            }
          } catch (cacheError) {
            console.warn('⚠️ فشل في حفظ المواقع في IndexedDB:', cacheError);
          }
          return data;
        }
      } catch (error) {
        console.warn('⚠️ فشل في جلب المواقع من API:', error);
      }
      
      // Fallback to IndexedDB for offline support
      try {
        const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
        const cachedLocations = await enhancedIndexedDB.getLocations();
        if (cachedLocations && cachedLocations.length > 0) {
          console.log('📊 استخدام المواقع المحفوظة محلياً:', cachedLocations.length);
          return cachedLocations;
        }
      } catch (offlineError) {
        console.warn('⚠️ فشل في جلب المواقع من IndexedDB:', offlineError);
      }
      
      return [];
    },
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.message === 'OFFLINE_MODE') return false;
      return failureCount < 2;
    }
  });

  // Enhanced users fetching with IndexedDB fallback
  const { data: regularUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/supervisor/regular-users'],
    queryFn: async () => {
      try {
        // First try API
        if (navigator.onLine) {
          const data = await apiRequest('/api/supervisor/regular-users', 'GET');
          // Cache in IndexedDB for offline use
          try {
            const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
            if (data && Array.isArray(data)) {
              for (const user of data) {
                await enhancedIndexedDB.saveUser(user);
              }
            }
          } catch (cacheError) {
            console.warn('⚠️ فشل في حفظ المستخدمين في IndexedDB:', cacheError);
          }
          return data;
        }
      } catch (error) {
        console.warn('⚠️ فشل في جلب المستخدمين من API:', error);
      }
      
      // Fallback to IndexedDB
      try {
        const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
        const cachedUsers = await enhancedIndexedDB.getUsers();
        if (cachedUsers && cachedUsers.length > 0) {
          console.log('📊 استخدام المستخدمين المحفوظين محلياً:', cachedUsers.length);
          return cachedUsers.filter((user: any) => user.role === 'user');
        }
      } catch (offlineError) {
        console.warn('⚠️ فشل في جلب المستخدمين من IndexedDB:', offlineError);
      }
      
      return [];
    },
    enabled: !!currentUser && ['admin', 'supervisor', 'hsa_group_admin', 'department_manager'].includes(currentUser.role),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.message === 'OFFLINE_MODE') return false;
      return failureCount < 2;
    }
  });

  // Enhanced permissions fetching with IndexedDB fallback
  const { data: currentUserPermissions, isLoading: userPermissionsLoading } = useQuery<UserLocationPermission[]>({
    queryKey: ['/api/supervisor/user-location-permissions'],
    queryFn: async () => {
      try {
        // First try API
        if (navigator.onLine) {
          const data = await apiRequest('/api/supervisor/user-location-permissions', 'GET');
          // Cache in IndexedDB for offline use
          try {
            const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
            if (data && Array.isArray(data)) {
              // Cache permissions data
              await enhancedIndexedDB.saveData('user_permissions', data);
            }
          } catch (cacheError) {
            console.warn('⚠️ فشل في حفظ الصلاحيات في IndexedDB:', cacheError);
          }
          return data;
        }
      } catch (error) {
        console.warn('⚠️ فشل في جلب الصلاحيات من API:', error);
      }
      
      // Fallback to IndexedDB
      try {
        const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
        const cachedData = await enhancedIndexedDB.getData('user_permissions');
        if (cachedData) {
          console.log('📊 استخدام الصلاحيات المحفوظة محلياً');
          return cachedData;
        }
      } catch (offlineError) {
        console.warn('⚠️ فشل في جلب الصلاحيات من IndexedDB:', offlineError);
      }
      
      return [];
    },
    enabled: !!currentUser && ['admin', 'supervisor', 'hsa_group_admin', 'department_manager'].includes(currentUser.role),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.message === 'OFFLINE_MODE') return false;
      return failureCount < 2;
    }
  });

  // Initialize permissions state when data loads - different logic for regular users vs admin/supervisors
  useEffect(() => {
    if (currentUser?.role === 'user') {
      // For regular users, just show their locations (no permission management)
      return;
    }
    
    // Admin/supervisor logic
    if (locations && currentUserPermissions && regularUsers) {
      // Initialize user-specific permissions - all enabled by default
      const userPermissionsMap: Record<number, Record<number, boolean>> = {};
      regularUsers.forEach(user => {
        userPermissionsMap[user.id] = {};
        locations.forEach(location => {
          userPermissionsMap[user.id][location.id] = true; // All locations enabled by default
        });
      });
      
      // Apply current user permissions from database
      currentUserPermissions.forEach(permission => {
        if (userPermissionsMap[permission.userId]) {
          userPermissionsMap[permission.userId][permission.locationId] = permission.isEnabled;
        }
      });
      
      setUserPermissions(userPermissionsMap);
      
      // Set default user if not set and users are available
      if (regularUsers.length > 0 && selectedUser === "14" && !regularUsers.find(u => u.id === 14)) {
        setSelectedUser(regularUsers[0].id.toString());
      }
    }
  }, [locations, currentUserPermissions, regularUsers, currentUser]);

  // Reset changes when user selection changes
  useEffect(() => {
    setHasChanges(false);
  }, [selectedUser]);



  // Save user-specific permissions mutation
  const saveUserPermissionsMutation = useMutation({
    mutationFn: async (data: { userId: number; allLocationIds: number[]; enabledLocationIds: number[] }) => {
      const { apiRequest } = await import('@/lib/queryClient');
      return await apiRequest('/api/supervisor/user-location-permissions', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supervisor/user-location-permissions'] });
      // Force refresh dashboard data for all users to reflect permission changes
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setHasChanges(false);
      toast({
        title: "تم حفظ صلاحيات المستخدم بنجاح",
        description: "ستطبق التغييرات على المستخدم فوراً عند تحديث الصفحة",
      });
    },
    onError: (error: any) => {
      console.error('Save user permissions error:', error);
      toast({
        title: "خطأ في حفظ صلاحيات المستخدم",
        description: "تعذر حفظ صلاحيات المواقع للمستخدم",
        variant: "destructive",
      });
    },
  });

  const handlePermissionChange = (locationId: number, enabled: boolean) => {
    const userId = parseInt(selectedUser);
    setUserPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [locationId]: enabled
      }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!locations) return;
    
    const userId = parseInt(selectedUser);
    const allLocationIds = locations.map(location => location.id);
    const enabledLocationIds = locations
      .filter(location => userPermissions[userId]?.[location.id] ?? true)
      .map(location => location.id);
    
    saveUserPermissionsMutation.mutate({ 
      userId, 
      allLocationIds,
      enabledLocationIds
    });
  };

  const handleReset = () => {
    if (locations && currentUserPermissions) {
      const userId = parseInt(selectedUser);
      const userPermissionsMap = { ...userPermissions };
      
      if (!userPermissionsMap[userId]) {
        userPermissionsMap[userId] = {};
      }
      
      locations.forEach(location => {
        userPermissionsMap[userId][location.id] = true; // Default
      });
      
      currentUserPermissions
        .filter(perm => perm.userId === userId)
        .forEach(permission => {
          userPermissionsMap[userId][permission.locationId] = permission.isEnabled;
        });
      
      setUserPermissions(userPermissionsMap);
      setHasChanges(false);
    }
  };

  const getCurrentPermissions = () => {
    const userId = parseInt(selectedUser);
    return userPermissions[userId] || {};
  };

  const currentPermissionsData = getCurrentPermissions();
  const enabledCount = Object.values(currentPermissionsData).filter(Boolean).length;
  const totalCount = Object.keys(currentPermissionsData).length;

  if (locationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Show different UI for regular users vs admin/supervisors
  if (currentUser?.role === 'user') {
    // Simple location view for regular users
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6 bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-black flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-400 text-black">
                <MapPin className="h-7 w-7" />
              </div>
              مواقع التقييم المتاحة لي
            </CardTitle>
            <p className="text-gray-600">
              المواقع التي يمكنني إجراء تقييمات عليها
            </p>
            <Badge variant="outline" className="text-sm border-yellow-400 text-black">
              {locations?.length || 0} موقع متاح
            </Badge>
          </CardHeader>
        </Card>

        {/* Locations Grid for Regular Users */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations?.map((location) => {
            const IconComponent = iconMap[location.icon as keyof typeof iconMap] || Building;
            
            return (
              <Card key={location.id} className="border-2 border-yellow-400 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-yellow-400 text-black">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-black">{location.nameAr}</h3>
                      <p className="text-sm text-gray-600">{location.nameEn}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-black bg-yellow-100 border border-yellow-400 px-2 py-1 rounded">
                      متاح للتقييم
                    </span>
                    <span className="text-gray-500">
                      ID: {location.id}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!locations || locations.length === 0 && (
          <Card className="p-8 text-center bg-white border border-gray-200">
            <div className="p-4 rounded-full bg-yellow-400 inline-block mb-4">
              <MapPin className="h-12 w-12 text-black" />
            </div>
            <h3 className="text-lg font-medium text-black mb-2">لا توجد مواقع متاحة</h3>
            <p className="text-gray-600">
              لم يتم تخصيص أي مواقع لك بعد. يرجى التواصل مع المشرف لتخصيص المواقع.
            </p>
          </Card>
        )}
      </div>
    );
  }

  // Admin/Supervisor UI (existing functionality)
  if (usersLoading || userPermissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6">
          {/* Enhanced Header Section with Better Layout */}
          <Card className="shadow-sm border border-gray-200 bg-white">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-3xl font-bold text-black flex items-center gap-4">
                  <div className="p-3 rounded-full bg-yellow-400 text-black shadow-sm">
                    <MapPin className="h-8 w-8" />
                  </div>
                  إدارة مواقع التقييم
                </CardTitle>
                
                {/* Stats Circle */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-2 border-black flex items-center justify-center bg-white shadow-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-black">{enabledCount}</div>
                        <div className="text-xs text-gray-600">من {totalCount}</div>
                        <div className="text-xs text-gray-500">مُفعل</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-lg text-gray-700 mb-4">
                  تحكم في المواقع التي يمكن للمستخدمين العاديين رؤيتها وتقييمها
                </p>
              </div>
              
              {/* User Selection Section */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-400">
                      <User className="h-5 w-5 text-black" />
                    </div>
                    <span className="text-lg font-semibold text-black">اختر المستخدم:</span>
                  </div>
                  
                  <div className="flex-1 max-w-md ml-6">
                    <Select 
                      value={selectedUser} 
                      onValueChange={(value) => {
                        setSelectedUser(value);
                        setHasChanges(false);
                      }}
                    >
                      <SelectTrigger className="h-12 text-lg border-2 border-gray-200 rounded-lg hover:border-black transition-colors bg-white">
                        <SelectValue placeholder="اختر مستخدم..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 bg-white">
                        {regularUsers?.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()} className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-full bg-yellow-400">
                                <User className="h-4 w-4 text-black" />
                              </div>
                              <div>
                                <div className="font-semibold text-black">{user.fullName}</div>
                                <div className="text-sm text-gray-500">({user.username})</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Enhanced Locations Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
            {locations?.map((location) => {
              const IconComponent = iconMap[location.icon as keyof typeof iconMap] || Building;
              const isEnabled = currentPermissionsData[location.id] ?? true;
              
              return (
                <Card key={location.id} className={`border-2 transition-all duration-300 hover:shadow-md bg-white ${
                  isEnabled 
                    ? 'border-yellow-400' 
                    : 'border-gray-200'
                }`}>
                  <CardContent className="p-6">
                    {/* Location Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg shadow-sm ${
                          isEnabled 
                            ? 'bg-yellow-400 text-black' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-black mb-1">{location.nameAr}</h3>
                          <p className="text-sm text-gray-600">{location.nameEn}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status and Toggle */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        isEnabled 
                          ? 'bg-yellow-100 text-black border border-yellow-400' 
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {isEnabled ? '✓ مُفعل' : '✗ مُعطل'}
                      </div>
                      
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handlePermissionChange(location.id, checked)}
                        className="scale-125"
                        style={{
                          '--switch-bg': isEnabled ? '#facc15' : '#9ca3af',
                        } as any}
                      />
                    </div>
                    
                    {/* User Info */}
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <User className="h-3 w-3" />
                        <span>
                          {(() => {
                            const selectedUserName = regularUsers?.find(u => u.id.toString() === selectedUser)?.fullName || 'المستخدم';
                            return isEnabled ? `مرئي لـ ${selectedUserName}` : `مخفي عن ${selectedUserName}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Enhanced Action Buttons */}
          {hasChanges && (
            <Card className="border-2 border-yellow-400 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-yellow-400">
                      <div className="w-3 h-3 bg-black rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-black">لديك تغييرات غير محفوظة</div>
                      <div className="text-sm text-gray-600">تأكد من حفظ التغييرات قبل المغادرة</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={saveUserPermissionsMutation.isPending}
                      className="flex items-center gap-2 h-12 px-6 border-2 border-gray-300 hover:border-black text-gray-700 hover:bg-gray-50 bg-white"
                    >
                      <RotateCcw className="h-5 w-5" />
                      تراجع عن التغييرات
                    </Button>
                    
                    <Button
                      onClick={handleSave}
                      disabled={saveUserPermissionsMutation.isPending}
                      className="flex items-center gap-2 h-12 px-8 bg-black hover:bg-gray-800 text-white font-semibold shadow-sm transition-all duration-200"
                    >
                      {saveUserPermissionsMutation.isPending ? (
                        <>
                          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5" />
                          حفظ الإعدادات
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Help Section */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-yellow-400">
                  <div className="text-2xl">💡</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-black mb-4">دليل الاستخدام</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-black mt-2"></div>
                        <p className="text-gray-700">اختر المستخدم من القائمة لتحديد المواقع التي يمكنه الوصول إليها</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2"></div>
                        <p className="text-gray-700">المواقع المُفعلة ستظهر للمستخدم في لوحة التحكم وقوائم التقييم</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-gray-400 mt-2"></div>
                        <p className="text-gray-700">المواقع غير المُفعلة ستكون مخفية عن المستخدم</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-black mt-2"></div>
                        <p className="text-gray-700">لا تنس حفظ الإعدادات بعد إجراء التغييرات</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </>
  );
}