import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import LoadingSpinner from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { formatArabicDate } from '@/lib/date-utils';
import { UserPlus, Edit, Key, Trash2, User, Clock, Settings, FileText, RefreshCw, Check, Users as UsersIcon, X, ChevronDown, Eye, EyeOff, AlertTriangle, Building, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  companyId?: number;
}



export default function UserManagement() {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isRolePermissionsOpen, setIsRolePermissionsOpen] = useState(false);
  const [isLocationAccessOpen, setIsLocationAccessOpen] = useState(false);
  const [selectedUserForLocationAccess, setSelectedUserForLocationAccess] = useState<User | null>(null);

  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);



  const [selectedUserRole, setSelectedUserRole] = useState<string>('');
  const [newUser, setNewUser] = useState({
    username: '',
    fullName: '',
    role: 'user',
    password: '',
  });

  const [editUser, setEditUser] = useState({
    id: 0,
    username: '',
    fullName: '',
    role: 'user',
    isActive: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user to determine permissions - استخدم نظام IndexedDB المطور
  const { user: currentUser, loading: isLoadingCurrentUser } = useAuth();

  // Enhanced permission checks with SUPERVISOR LIMITED ACCESS
  const adminRoles = ['admin', 'general_manager', 'department_manager'];
  const supervisorRole = ['supervisor'];
  const allowedRoles = [...adminRoles, ...supervisorRole];
  
  // ✅ تحسين فحص الصلاحيات مع التحقق من حالة التحميل
  const canManageUsers = currentUser ? (allowedRoles.includes(currentUser?.role || '') || currentUser?.canManageUsers === true) : false;

  // Get users with proper error handling - باستخدام token من IndexedDB
  const { data: allUsers, isLoading, error } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        return await apiRequest('/api/users', 'GET');
      } catch (error: any) {
        console.error('❌ Error loading users:', error);
        throw error;
      }
    },
    retry: 2,
    enabled: canManageUsers && !isLoadingCurrentUser // فقط اجلب البيانات بعد التحميل وإذا كان لديه صلاحية
  });
  
  // إضافة تحقق إضافي من البيانات
  useEffect(() => {
    console.log('🔍 Current User Debug:', {
      currentUser,
      isLoading: isLoadingCurrentUser,
      role: currentUser?.role,
      canManageUsers: currentUser?.canManageUsers
    });
  }, [currentUser, isLoadingCurrentUser]);

  // Debug logging for permission troubleshooting
  console.log('🔍 UserManagement Permission Debug:', {
    currentUser,
    allowedRoles,
    canManageUsers,
    role: currentUser?.role,
    includes: allowedRoles.includes(currentUser?.role || ''),
    canManageUsersProperty: currentUser?.canManageUsers
  });
  
  // Different access levels based on role
  const isAdmin = adminRoles.includes(currentUser?.role || '');
  const isSupervisor = currentUser?.role === 'supervisor';

  // Get locations for location access management
  const { data: locations } = useQuery({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      return await apiRequest('/api/locations', 'GET');
    },
    enabled: isSupervisor, // Only load when supervisor is viewing
  });

  // Get user location permissions
  const { data: userLocationPermissions, refetch: refetchUserLocationPermissions } = useQuery({
    queryKey: ['/api/user-location-permissions', selectedUserForLocationAccess?.id],
    queryFn: async () => {
      if (!selectedUserForLocationAccess?.id) return [];
      return await apiRequest(`/api/user-location-permissions/${selectedUserForLocationAccess.id}`, 'GET');
    },
    enabled: !!selectedUserForLocationAccess?.id,
  });
  
  // SUPERVISOR: Limited to basic user operations only
  const canCreateUser = isAdmin || isSupervisor; // Supervisors can create regular users only
  const canEditUser = isAdmin || isSupervisor; // Supervisors can edit regular users only
  const canDeleteUser = isAdmin; // Only admins can delete users
  const canManageRoles = isAdmin; // Only admins can change roles
  const canManageMenus = isAdmin; // Only admins can manage menus
  
  // Role creation restrictions based on user level
  const getAllowedRoles = () => {
    // التأكد من وجود بيانات المستخدم
    if (!currentUser) {
      return [{ value: 'user', label: 'مستخدم عادي' }];
    }
    
    // SUPERVISORS: Can only create regular users
    if (currentUser.role === 'supervisor') {
      return [
        { value: 'user', label: 'مستخدم عادي' }
      ];
    }
    
    // ADMIN ACCESS: Full role management
    if (adminRoles.includes(currentUser.role || '') || 
        currentUser.username === 'hsa_group_admin' || 
        currentUser.role === 'super_admin') {
      return [
        { value: 'user', label: 'مستخدم عادي' },
        { value: 'supervisor', label: 'مشرف' }
      ];
    }
    
    return [{ value: 'user', label: 'مستخدم عادي' }];
  };

  // Professional filtering system with SUPERVISOR RESTRICTIONS
  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    
    return allUsers
      .filter(user => {
        // SUPERVISOR RESTRICTION: Can only see regular users 
        if (isSupervisor) {
          // Supervisors can only see and manage regular users, not other supervisors or admins
          if (user.role !== 'user') {
            return false;
          }
        }
        
        // Optimized search logic
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = user.fullName.toLowerCase().includes(searchLower) ||
                               user.username.toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }
        
        // Role filtering with enhanced logic
        if (roleFilter !== 'all' && user.role !== roleFilter) return false;
        
        // Status filtering with comprehensive logic
        if (statusFilter === 'active' && !user.isActive) return false;
        if (statusFilter === 'inactive' && user.isActive) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Professional sorting: Active users first, then alphabetical
        if (a.isActive !== b.isActive) {
          return a.isActive ? -1 : 1;
        }
        return a.fullName.localeCompare(b.fullName, 'ar');
      });
  }, [allUsers, searchTerm, roleFilter, statusFilter, isSupervisor]);

  // Advanced user statistics with SUPERVISOR RESTRICTIONS
  const userStats = useMemo(() => {
    if (!allUsers) return null;
    
    // Apply same filtering as filteredUsers for consistent stats
    const usersToCount = isSupervisor 
      ? allUsers.filter(user => user.role === 'user') 
      : allUsers;
    
    const stats = {
      total: usersToCount.length,
      active: 0,
      inactive: 0,
      admins: 0,
      supervisors: 0,
      users: 0,
      neverLoggedIn: 0,
      recentlyCreated: 0, // Users created in last 7 days
    };
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    usersToCount.forEach(user => {
      // Status counts
      if (user.isActive) stats.active++; else stats.inactive++;
      
      // Role counts (supervisors only see regular users anyway)
      if (user.role === 'admin') stats.admins++;
      else if (user.role === 'supervisor') stats.supervisors++;
      else stats.users++;
      
      // Activity counts
      if (!user.lastLoginAt) stats.neverLoggedIn++;
      if (new Date(user.createdAt) > weekAgo) stats.recentlyCreated++;
    });
    
    return stats;
  }, [allUsers, isSupervisor]);

  // Generate secure password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const length = 12;
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser(prev => ({ ...prev, password }));
  };

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      return apiRequest('/api/users', 'POST', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsAddUserOpen(false);
      setNewUser({ username: '', fullName: '', role: 'user', password: '' });
      toast({
        title: "تم إنشاء المستخدم بنجاح",
        description: "تم إضافة المستخدم الجديد إلى النظام",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في إنشاء المستخدم",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: typeof editUser) => {
      return apiRequest(`/api/users/${userData.id}`, 'PUT', {
        username: userData.username,
        fullName: userData.fullName,
        role: userData.role,
        isActive: userData.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditUserOpen(false);
      toast({
        title: "تم تحديث المستخدم بنجاح",
        description: "تم حفظ التغييرات بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تحديث المستخدم",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle user status mutation (activate/deactivate)
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      return apiRequest(`/api/users/${userId}`, 'PUT', { isActive });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: variables.isActive ? "تم تفعيل المستخدم" : "تم إلغاء تفعيل المستخدم",
        description: variables.isActive ? "يمكن للمستخدم تسجيل الدخول الآن" : "لا يمكن للمستخدم تسجيل الدخول",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تحديث حالة المستخدم",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation - keep for extreme cases
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/users/${userId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "تم حذف المستخدم بنجاح",
        description: "تم إزالة المستخدم من النظام نهائياً",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في حذف المستخدم",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/users/${userId}/reset-password`, 'POST');
    },
    onSuccess: (data) => {
      // Copy password to clipboard
      navigator.clipboard.writeText(data.newPassword).then(() => {
        toast({
          title: "✅ تم إعادة تعيين كلمة المرور بنجاح",
          description: (
            <div className="space-y-3 p-2">
              <div className="text-right">
                <span className="text-sm text-gray-600">المستخدم: </span>
                <span className="font-medium">{data.userName}</span>
              </div>
              
              <div className="bg-white border-2 border-gray-300 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-2">كلمة المرور الجديدة:</div>
                <div className="text-2xl font-bold font-mono bg-gray-50 border border-gray-200 rounded px-4 py-2 tracking-wider select-all">
                  {data.newPassword}
                </div>
              </div>
              
              <div className="text-xs text-green-600 text-center">
                ✅ تم نسخ كلمة المرور للحافظة
              </div>
            </div>
          ),
          duration: 12000, // 12 seconds
        });
      }).catch(() => {
        toast({
          title: "✅ تم إعادة تعيين كلمة المرور بنجاح",
          description: (
            <div className="space-y-3 p-2">
              <div className="text-right">
                <span className="text-sm text-gray-600">المستخدم: </span>
                <span className="font-medium">{data.userName}</span>
              </div>
              
              <div className="bg-white border-2 border-gray-300 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-2">كلمة المرور الجديدة:</div>
                <div className="text-2xl font-bold font-mono bg-gray-50 border border-gray-200 rounded px-4 py-2 tracking-wider select-all">
                  {data.newPassword}
                </div>
              </div>
              
              <div className="text-xs text-orange-600 text-center">
                ⚠️ يرجى نسخ كلمة المرور يدوياً
              </div>
            </div>
          ),
          duration: 15000, // 15 seconds
        });
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في إعادة تعيين كلمة المرور",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Role management mutation (Admin only)
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: number, newRole: string }) => {
      return apiRequest(`/api/users/${userId}/role`, 'PUT', { role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "تم تحديث الصلاحية بنجاح",
        description: "تم تغيير صلاحية المستخدم بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تحديث الصلاحية",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Location permissions mutation - Supervisor Only
  const updateLocationPermissionsMutation = useMutation({
    mutationFn: async ({ userId, locationIds }: { userId: number, locationIds: number[] }) => {
      return apiRequest(`/api/users/${userId}/location-permissions`, 'PUT', { locationIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-location-permissions'] });
      refetchUserLocationPermissions();
      toast({
        title: "تم تحديث صلاحيات المواقع",
        description: "تم تحديث صلاحيات الوصول للمواقع بنجاح",
      });
      setIsLocationAccessOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تحديث صلاحيات المواقع",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle user actions
  const handleCreateUser = () => {
    if (!newUser.username || !newUser.fullName || !newUser.password) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleEditUser = (user: User) => {
    setEditUser({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    });
    setIsEditUserOpen(true);
  };

  const handleUpdateUser = () => {
    if (!editUser.username || !editUser.fullName) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    updateUserMutation.mutate(editUser);
  };

  // Handle user status toggle
  const handleToggleUserStatus = (userId: number, currentStatus: boolean) => {
    // Prevent modifying current user status
    if (userId === (currentUser as any)?.id) {
      toast({
        title: "عملية غير مسموحة",
        description: "لا يمكنك تعطيل حسابك الشخصي",
        variant: "destructive",
      });
      return;
    }
    toggleUserStatusMutation.mutate({ userId, isActive: !currentStatus });
  };

  const handleDeleteUser = (userId: number) => {
    // Prevent deleting current user
    if (userId === (currentUser as any)?.id) {
      toast({
        title: "عملية غير مسموحة",
        description: "لا يمكنك حذف حسابك الخاص",
        variant: "destructive",
      });
      return;
    }
    deleteUserMutation.mutate(userId);
  };

  // Handle role changes (Admin only) - Three-tier system
  const handlePromoteUser = (userId: number, currentRole: string) => {
    // Prevent modifying own role
    if (userId === (currentUser as any)?.id) {
      toast({
        title: "عملية غير مسموحة",
        description: "لا يمكنك تعديل صلاحيتك الشخصية",
        variant: "destructive",
      });
      return;
    }

    let newRole: string;
    // Role hierarchy: user → supervisor → admin → user
    if (currentRole === 'user') {
      newRole = 'supervisor';
    } else if (currentRole === 'supervisor') {
      newRole = 'admin';
    } else {
      newRole = 'user';
    }

    updateUserRoleMutation.mutate({ userId, newRole });
  };







  const handleBulkAction = (action: string) => {
    if (selectedUsers.length === 0) {
      toast({
        title: "لم يتم تحديد مستخدمين",
        description: "يرجى تحديد المستخدمين أولاً",
        variant: "destructive",
      });
      return;
    }

    // Implement bulk actions here
    console.log(`Bulk action: ${action} for users:`, selectedUsers);
    setIsBulkActionsOpen(false);
  };

  const handleSelectUser = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Location access management - Supervisor only
  const openLocationAccessDialog = (user: User) => {
    setSelectedUserForLocationAccess(user);
    setIsLocationAccessOpen(true);
  };

  const handleUpdateLocationPermissions = (locationIds: number[]) => {
    if (selectedUserForLocationAccess) {
      updateLocationPermissionsMutation.mutate({
        userId: selectedUserForLocationAccess.id,
        locationIds
      });
    }
  };

  // ✅ فحص التحميل أولاً لتجنب عرض "غير مصرح" أثناء التحميل
  if (isLoading || isLoadingCurrentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // Permission check for UI rendering - بعد انتهاء التحميل
  if (!canManageUsers) {
    // Log permission denial for debugging
    console.log('❌ User Management Access Denied:', {
      username: (currentUser as any)?.username,
      role: (currentUser as any)?.role,
      canManageUsers,
      allowedRoles,
      currentUser,
      roleIncluded: allowedRoles.includes((currentUser as any)?.role)
    });
    
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-16">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">غير مصرح بالوصول</h2>
              <p className="text-gray-600">ليس لديك صلاحية للوصول إلى إدارة المستخدمين</p>
              <div className="mt-4 text-xs text-gray-400" dir="ltr">
                Debug: Role={((currentUser as any)?.role || 'undefined')}, Username={((currentUser as any)?.username || 'undefined')}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('❌ Error loading users:', error);
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-16">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">حدث خطأ غير متوقع</h2>
              <p className="text-gray-600 mb-4">نعتذر، حدث خطأ في التطبيق. يرجى إعادة تحميل الصفحة.</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="bg-brand-yellow hover:bg-yellow-500 text-brand-black"
              >
                إعادة تحميل الصفحة
              </Button>
              <div className="mt-4 text-xs text-gray-400" dir="ltr">
                Error: {error?.message || 'Unknown error'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Statistics Dashboard */}
        {userStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">المستخدمون النشطون</p>
                    <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                    <Check className="h-5 w-5 text-black" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">المستخدمون المعطلون</p>
                    <p className="text-2xl font-bold text-red-600">{userStats.inactive}</p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                    <X className="h-5 w-5 text-black" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">إجمالي المستخدمين</p>
                    <p className="text-2xl font-bold text-blue-600">{userStats.total}</p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                    <UsersIcon className="h-5 w-5 text-black" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">لم يسجلوا دخول</p>
                    <p className="text-2xl font-bold text-orange-600">{userStats.neverLoggedIn}</p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-black" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
            <p className="text-gray-600">إدارة حسابات المستخدمين وصلاحياتهم</p>
          </div>
          
          <div className="flex gap-3">
            {selectedUsers.length > 0 && (
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setIsBulkActionsOpen(!isBulkActionsOpen)}
                  className="flex items-center gap-2"
                >
                  إجراءات جماعية ({selectedUsers.length})
                  <ChevronDown className="h-4 w-4" />
                </Button>
                
                {isBulkActionsOpen && (
                  <div className="absolute top-full mt-2 right-0 bg-white border rounded-lg shadow-lg z-10 min-w-48">
                    <div className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleBulkAction('deactivate')}
                      >
                        <X className="h-4 w-4 mr-2" />
                        إلغاء تفعيل
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleBulkAction('activate')}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        تفعيل
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-yellow hover:bg-yellow-500 text-brand-black">
                  <UserPlus className="h-4 w-4 mr-2" />
                  إضافة مستخدم جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-right">إضافة مستخدم جديد</DialogTitle>
                  <DialogDescription className="text-right text-gray-600">
                    أدخل بيانات المستخدم الجديد
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">اسم المستخدم (إنجليزي فقط)</Label>
                    <Input
                      id="username"
                      value={newUser.username}
                      onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="أدخل اسم المستخدم بالإنجليزية (مثل: ahmed-aref)"
                      className="text-left"
                      dir="ltr"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fullName">الاسم الكامل (عربي)</Label>
                    <Input
                      id="fullName"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="أدخل الاسم الكامل بالعربية (مثل: أحمد عارف)"
                      className="text-right"
                      dir="rtl"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="role">الدور</Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAllowedRoles().map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="password">كلمة المرور</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={newUser.password}
                          onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="أدخل كلمة المرور"
                          className="text-left pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generatePassword}
                        className="px-3"
                      >
                        توليد
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          disabled={createUserMutation.isPending}
                          className="flex-1 bg-brand-yellow hover:bg-yellow-500 text-brand-black"
                        >
                          {createUserMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black ml-2"></div>
                          ) : (
                            <UserPlus className="h-4 w-4 ml-2" />
                          )}
                          إنشاء المستخدم
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-green-500" />
                            تأكيد إضافة مستخدم جديد
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            <div className="space-y-3">
                              <p>هل أنت متأكد من إضافة المستخدم الجديد بالبيانات التالية؟</p>
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-green-800 font-medium">الاسم الكامل:</span>
                                  <span className="text-green-700">{newUser.fullName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-green-800 font-medium">اسم المستخدم:</span>
                                  <span className="text-green-700">@{newUser.username}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-green-800 font-medium">الصلاحية:</span>
                                  <span className="text-green-700">
                                    {newUser.role === 'admin' ? 'مدير' : 
                                     newUser.role === 'supervisor' ? 'مشرف' : 
                                     'مستخدم عادي'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCreateUser}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            تأكيد إضافة المستخدم
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      onClick={() => setIsAddUserOpen(false)}
                      variant="outline"
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <Input
                  placeholder="البحث عن مستخدم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-right"
                />
              </div>
              
              <div className="min-w-32">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأدوار</SelectItem>
                    <SelectItem value="supervisor">مشرف</SelectItem>
                    <SelectItem value="user">مستخدم عادي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="min-w-32">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="active">مفعل</SelectItem>
                    <SelectItem value="inactive">معطل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                المستخدمون ({filteredUsers.length})
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">تحديد الكل</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-4 font-medium">تحديد</th>
                    <th className="text-right py-3 px-4 font-medium">المستخدم</th>
                    <th className="text-right py-3 px-4 font-medium">الدور</th>
                    <th className="text-right py-3 px-4 font-medium">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium">آخر دخول</th>
                    <th className="text-right py-3 px-4 font-medium">تاريخ الإنشاء</th>
                    <th className="text-right py-3 px-4 font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className={`border-b hover:bg-gray-50 transition-all duration-200 ${
                      !user.isActive ? 'bg-gray-50/50 opacity-80' : ''
                    }`}>
                      <td className="py-3 px-4">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                          className={!user.isActive ? 'opacity-60' : ''}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                            user.isActive 
                              ? 'bg-brand-yellow' 
                              : 'bg-gray-300'
                          }`}>
                            <User className={`h-5 w-5 ${
                              user.isActive 
                                ? 'text-brand-black' 
                                : 'text-gray-500'
                            }`} />
                          </div>
                          <div>
                            <div className={`font-medium transition-colors duration-200 flex items-center gap-2 ${
                              user.isActive 
                                ? 'text-gray-900' 
                                : 'text-gray-500'
                            }`}>
                              {user.username}
                              {!user.isActive && (
                                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                                  معطل
                                </span>
                              )}
                            </div>
                            <div className={`text-sm transition-colors duration-200 ${
                              user.isActive 
                                ? 'text-gray-500' 
                                : 'text-gray-400'
                            }`}>
                              {user.fullName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' : 
                          user.role === 'general_manager' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'supervisor' ? 'bg-yellow-100 text-yellow-800' :
                          user.role === 'data_specialist' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role === 'admin' ? 'مدير' : 
                           user.role === 'general_manager' ? 'مدير عام المجموعة' :
                           user.role === 'owner' ? 'مدير النظام' :
                           user.role === 'supervisor' ? 'مشرف' :
                           user.role === 'data_specialist' ? 'اخصائي بيانات الشركة' : 
                           'مستخدم عادي'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800 shadow-sm' 
                            : 'bg-red-100 text-red-800 shadow-sm'
                        }`}>
                          {user.isActive ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              مفعل
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              معطل
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {user.lastLoginAt ? formatArabicDate(new Date(user.lastLoginAt)) : 'لم يسجل دخول'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatArabicDate(new Date(user.createdAt))}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {/* تحديد ما إذا كان المستخدم مدير شؤون إدارية لتعطيل الأزرار */}
                          {(() => {
                            const isAdminUser = user.fullName === 'مدير الشؤون الادارية' || 
                                               user.username === 'owner' || 
                                               user.username === 'owner-ycfms';
                            
                            // تحديد ما إذا كان المستخدم أخصائي بيانات الشركة
                            const isDataSpecialist = user.role === 'data_specialist';
                            
                            return (
                              <>
                                {/* تعطيل أيقونة التعديل لاخصائي بيانات الشركة ومدير الشؤون الادارية */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={isDataSpecialist || isAdminUser
                                    ? "text-gray-400 cursor-not-allowed" 
                                    : "text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                                  }
                                  onClick={isDataSpecialist || isAdminUser
                                    ? undefined 
                                    : () => handleEditUser(user)
                                  }
                                  disabled={isDataSpecialist || isAdminUser}
                                  title={isDataSpecialist 
                                    ? "لا يمكن تعديل اخصائي بيانات الشركة" 
                                    : isAdminUser ? "لا يمكن تعديل مدير الشؤون الإدارية"
                                    : "تعديل المستخدم"
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                          
                                {/* Location Access Management - Supervisor Only */}
                                {isSupervisor && user.role === 'user' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-purple-600 hover:text-purple-900 hover:bg-purple-50"
                                    onClick={() => openLocationAccessDialog(user)}
                                    title="إدارة صلاحيات المواقع"
                                  >
                                    <MapPin className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className={isAdminUser
                                        ? "text-gray-400 cursor-not-allowed"
                                        : "text-orange-600 hover:text-orange-900 hover:bg-orange-50"
                                      }
                                      title={isAdminUser ? "لا يمكن إعادة تعيين كلمة مرور مدير الشؤون الإدارية"
                                        : "إعادة تعيين كلمة المرور"
                                      }
                                      disabled={isAdminUser || resetPasswordMutation.isPending}
                                    >
                                      <Key className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                                  تأكيد إعادة تعيين كلمة المرور
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  <div className="space-y-3">
                                    <p>هل أنت متأكد من إعادة تعيين كلمة المرور للمستخدم "{user.username}"؟</p>
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                      <p className="text-orange-800 font-medium text-sm">
                                        ⚠️ سيتم إنشاء كلمة مرور جديدة
                                      </p>
                                      <p className="text-orange-700 text-sm mt-1">
                                        ستحتاج إلى إعطاء كلمة المرور الجديدة للمستخدم
                                      </p>
                                    </div>
                                  </div>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => resetPasswordMutation.mutate(user.id)}
                                  className="bg-orange-600 hover:bg-orange-700"
                                >
                                  إعادة تعيين كلمة المرور
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          
                          {/* Toggle User Status Button */}
                          {user.id !== (currentUser as any)?.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={user.isActive 
                                    ? "text-red-600 hover:text-red-900 hover:bg-red-50"
                                    : "text-green-600 hover:text-green-900 hover:bg-green-50"
                                  }
                                  title={user.isActive ? "إلغاء تفعيل المستخدم" : "تفعيل المستخدم"}
                                  disabled={toggleUserStatusMutation.isPending}
                                >
                                  {user.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    {user.isActive ? (
                                      <>
                                        <X className="h-5 w-5 text-red-500" />
                                        تأكيد إلغاء التفعيل
                                      </>
                                    ) : (
                                      <>
                                        <Check className="h-5 w-5 text-green-500" />
                                        تأكيد التفعيل
                                      </>
                                    )}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {user.isActive 
                                      ? `هل أنت متأكد من إلغاء تفعيل المستخدم "${user.username}"؟ لن يتمكن من تسجيل الدخول.`
                                      : `هل أنت متأكد من تفعيل المستخدم "${user.username}"؟ سيتمكن من تسجيل الدخول مرة أخرى.`
                                    }
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                                    className={user.isActive 
                                      ? "bg-red-600 hover:bg-red-700"
                                      : "bg-green-600 hover:bg-green-700"
                                    }
                                  >
                                    {user.isActive ? "إلغاء التفعيل" : "تفعيل"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          
                          {/* Keep Delete Button for Emergency Cases - Hidden by Default */}
                          {user.id !== (currentUser as any)?.id && canManageUsers && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={user.role === 'data_specialist' || user.fullName === 'مدير الشؤون الادارية' || user.username === 'owner' || user.username === 'owner-ycfms'
                                    ? "text-gray-400 cursor-not-allowed opacity-30" 
                                    : "text-red-800 hover:text-red-900 hover:bg-red-100 opacity-50 hover:opacity-100"
                                  }
                                  disabled={user.role === 'data_specialist' || user.fullName === 'مدير الشؤون الادارية' || user.username === 'owner' || user.username === 'owner-ycfms'}
                                  title={user.role === 'data_specialist' 
                                    ? "لا يمكن حذف اخصائي بيانات الشركة" 
                                    : (user.fullName === 'مدير الشؤون الادارية' || user.username === 'owner' || user.username === 'owner-ycfms')
                                    ? "لا يمكن حذف مدير الشؤون الإدارية" 
                                    : "حذف نهائي - استخدام للحالات الطارئة فقط"
                                  }
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    تأكيد الحذف النهائي
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <div className="space-y-2">
                                      <p>هل أنت متأكد من الحذف النهائي للمستخدم "{user.username}"؟</p>
                                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-red-800 font-medium text-sm">
                                          ⚠️ تحذير: هذا الإجراء نهائي ولا يمكن التراجع عنه
                                        </p>
                                        <p className="text-red-700 text-sm mt-1">
                                          سيتم حذف جميع بيانات المستخدم نهائياً من النظام
                                        </p>
                                      </div>
                                      <p className="text-gray-600 text-sm">
                                        بدلاً من ذلك، يُنصح بإلغاء تفعيل المستخدم للحفاظ على البيانات التاريخية
                                      </p>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="bg-red-700 hover:bg-red-800"
                                  >
                                    حذف نهائي
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  لا توجد مستخدمون مطابقون لمعايير البحث
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-right">تعديل المستخدم</DialogTitle>
              <DialogDescription className="text-right text-gray-600">
                تعديل بيانات المستخدم
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-username">اسم المستخدم</Label>
                <Input
                  id="edit-username"
                  value={editUser.username}
                  onChange={(e) => setEditUser(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="أدخل اسم المستخدم"
                  className="text-right"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-fullName">الاسم الكامل</Label>
                <Input
                  id="edit-fullName"
                  value={editUser.fullName}
                  onChange={(e) => setEditUser(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="أدخل الاسم الكامل"
                  className="text-right"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-role">الدور</Label>
                <Select value={editUser.role} onValueChange={(value) => setEditUser(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllowedRoles().map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isActive"
                  checked={editUser.isActive}
                  onCheckedChange={(checked) => setEditUser(prev => ({ ...prev, isActive: checked as boolean }))}
                />
                <Label htmlFor="edit-isActive">الحساب مفعل</Label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={updateUserMutation.isPending}
                      className="flex-1 bg-brand-yellow hover:bg-yellow-500 text-brand-black"
                    >
                      {updateUserMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black ml-2"></div>
                      ) : (
                        <Check className="h-4 w-4 ml-2" />
                      )}
                      حفظ التغييرات
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5 text-blue-500" />
                        تأكيد حفظ التغييرات
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        <div className="space-y-3">
                          <p>هل أنت متأكد من حفظ التعديلات على بيانات المستخدم؟</p>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-blue-800 font-medium">المستخدم:</span>
                              <span className="text-blue-700">{editUser.username}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-800 font-medium">الحالة:</span>
                              <span className="text-blue-700">{editUser.isActive ? 'مفعل' : 'معطل'}</span>
                            </div>
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleUpdateUser}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        تأكيد حفظ التغييرات
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  onClick={() => setIsEditUserOpen(false)}
                  variant="outline"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Location Access Management Dialog - Supervisor Only */}
        <Dialog open={isLocationAccessOpen} onOpenChange={setIsLocationAccessOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-right flex items-center gap-2">
                <MapPin className="h-5 w-5 text-purple-600" />
                إدارة صلاحيات المواقع - {selectedUserForLocationAccess?.fullName}
              </DialogTitle>
              <DialogDescription className="text-right text-gray-600">
                حدد المواقع التي يمكن للمستخدم الوصول إليها
              </DialogDescription>
            </DialogHeader>
            <LocationAccessManager
              userId={selectedUserForLocationAccess?.id}
              userLocationPermissions={userLocationPermissions}
              locations={locations}
              onUpdate={handleUpdateLocationPermissions}
              isUpdating={updateLocationPermissionsMutation.isPending}
            />
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

// Location Access Manager Component
interface LocationAccessManagerProps {
  userId?: number;
  userLocationPermissions?: number[];
  locations?: any[];
  onUpdate: (locationIds: number[]) => void;
  isUpdating: boolean;
}

function LocationAccessManager({ 
  userId, 
  userLocationPermissions = [], 
  locations = [], 
  onUpdate, 
  isUpdating 
}: LocationAccessManagerProps) {
  const [selectedLocationIds, setSelectedLocationIds] = useState<number[]>([]);

  useEffect(() => {
    setSelectedLocationIds(userLocationPermissions);
  }, [userLocationPermissions]);

  const handleLocationToggle = (locationId: number, checked: boolean) => {
    if (checked) {
      setSelectedLocationIds(prev => [...prev, locationId]);
    } else {
      setSelectedLocationIds(prev => prev.filter(id => id !== locationId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLocationIds(locations.map(loc => loc.id));
    } else {
      setSelectedLocationIds([]);
    }
  };

  const handleSave = () => {
    onUpdate(selectedLocationIds);
  };

  if (!userId) return null;

  return (
    <div className="space-y-4">
      {locations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          لا توجد مواقع متاحة
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Checkbox
              checked={selectedLocationIds.length === locations.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="font-medium">
              تحديد جميع المواقع ({locations.length})
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <div className="space-y-2 p-4">
              {locations.map((location) => (
                <div key={location.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                  <Checkbox
                    checked={selectedLocationIds.includes(location.id)}
                    onCheckedChange={(checked) => handleLocationToggle(location.id, checked as boolean)}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    {location.icon && (
                      <span className="text-xl">{location.icon}</span>
                    )}
                    <div>
                      <div className="font-medium">{location.nameAr}</div>
                      {location.nameEn && (
                        <div className="text-sm text-gray-500">{location.nameEn}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              المحدد: {selectedLocationIds.length} من {locations.length}
            </div>
            <Button
              onClick={handleSave}
              disabled={isUpdating}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 ml-2" />
                  حفظ الصلاحيات
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}