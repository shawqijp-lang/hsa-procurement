import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import LoadingSpinner from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { formatArabicDate } from '@/lib/date-utils';
import { Shield, UserPlus, ToggleLeft, ToggleRight, Key, MoreVertical, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AnalyticsUser {
  id: number;
  username: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export default function AnalyticsUsersManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({
    username: '',
    fullName: '',
    password: ''
  });
  const [newPassword, setNewPassword] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch analytics users
  const { data: analyticsUsers = [], isLoading } = useQuery<AnalyticsUser[]>({
    queryKey: ['/api/enhanced-gm/analytics-users'],
    staleTime: 30000,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof createForm) => {
      return apiRequest('/api/enhanced-gm/analytics-users', 'POST', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-gm/analytics-users'] });
      setIsCreateDialogOpen(false);
      setCreateForm({ username: '', fullName: '', password: '' });
      toast({
        title: "تم إنشاء المستخدم بنجاح",
        description: "تم إضافة مستخدم تحليلات جديد",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إنشاء المستخدم",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  // Toggle user status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/enhanced-gm/analytics-users/${userId}/toggle`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-gm/analytics-users'] });
      toast({
        title: "تم تحديث حالة المستخدم",
        description: "تم تغيير حالة تفعيل المستخدم بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في تحديث الحالة",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      return apiRequest(`/api/enhanced-gm/analytics-users/${userId}/reset-password`, 'PATCH', { password });
    },
    onSuccess: () => {
      setIsPasswordResetDialogOpen(false);
      setSelectedUserId(null);
      setNewPassword('');
      toast({
        title: "تم إعادة تعيين كلمة المرور",
        description: "تم تحديث كلمة المرور بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إعادة تعيين كلمة المرور",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!createForm.username.trim() || !createForm.fullName.trim()) {
      toast({
        title: "حقول مطلوبة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(createForm);
  };

  const handleToggleStatus = (userId: number) => {
    toggleStatusMutation.mutate(userId);
  };

  const handleResetPassword = () => {
    if (!newPassword.trim() || !selectedUserId) {
      toast({
        title: "كلمة مرور مطلوبة",
        description: "يرجى إدخال كلمة المرور الجديدة",
        variant: "destructive",
      });
      return;
    }
    resetPasswordMutation.mutate({ userId: selectedUserId, password: newPassword });
  };

  const openPasswordResetDialog = (userId: number) => {
    setSelectedUserId(userId);
    setIsPasswordResetDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3 space-x-reverse">
          <Shield className="h-6 w-6 text-yellow-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            إدارة مستخدمي التحليلات
          </h2>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
              <UserPlus className="h-4 w-4 ml-2" />
              إضافة مستخدم تحليلات
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>إضافة مستخدم تحليلات جديد</DialogTitle>
              <DialogDescription>
                قم بإدخال بيانات المستخدم الجديد لإنشاء حساب تحليلات
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="username">اسم المستخدم</Label>
                <Input
                  id="username"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  placeholder="أدخل اسم المستخدم"
                  data-testid="input-analytics-username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input
                  id="fullName"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="أدخل الاسم الكامل"
                  data-testid="input-analytics-fullname"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="أدخل كلمة المرور"
                  data-testid="input-analytics-password"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 space-x-reverse pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
                data-testid="button-cancel-analytics-user"
              >
                إلغاء
              </Button>
              <Button 
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending}
                className="bg-yellow-600 hover:bg-yellow-700"
                data-testid="button-create-analytics-user"
              >
                {createUserMutation.isPending ? "جاري الإنشاء..." : "إنشاء المستخدم"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <Users className="h-5 w-5" />
            <span>قائمة مستخدمي التحليلات ({analyticsUsers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analyticsUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>لا توجد حسابات تحليلات مسجلة</p>
              <p className="text-sm mt-2">قم بإضافة أول مستخدم تحليلات</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analyticsUsers.map((user: AnalyticsUser) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  data-testid={`analytics-user-${user.id}`}
                >
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                        <Shield className="h-5 w-5 text-yellow-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user.fullName}
                        </h3>
                        <Badge 
                          variant={user.isActive ? "default" : "secondary"}
                          className={user.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                        >
                          {user.isActive ? "نشط" : "غير نشط"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        @{user.username}
                      </p>
                      <div className="flex items-center space-x-4 space-x-reverse text-xs text-gray-400 mt-1">
                        <span>تم الإنشاء: {formatArabicDate(user.createdAt)}</span>
                        {user.lastLoginAt && (
                          <span>آخر دخول: {formatArabicDate(user.lastLoginAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    {/* Toggle Status */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(user.id)}
                      disabled={toggleStatusMutation.isPending}
                      className="h-8"
                      data-testid={`button-toggle-status-${user.id}`}
                    >
                      {user.isActive ? (
                        <>
                          <ToggleRight className="h-4 w-4 ml-1 text-green-600" />
                          إلغاء التفعيل
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 ml-1 text-gray-400" />
                          تفعيل
                        </>
                      )}
                    </Button>
                    
                    {/* Reset Password */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPasswordResetDialog(user.id)}
                      className="h-8"
                      data-testid={`button-reset-password-${user.id}`}
                    >
                      <Key className="h-4 w-4 ml-1" />
                      إعادة تعيين
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إعادة تعيين كلمة المرور</DialogTitle>
            <DialogDescription>
              أدخل كلمة المرور الجديدة للمستخدم
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
                data-testid="input-new-password"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPasswordResetDialogOpen(false);
                setSelectedUserId(null);
                setNewPassword('');
              }}
              data-testid="button-cancel-password-reset"
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
              data-testid="button-confirm-password-reset"
            >
              {resetPasswordMutation.isPending ? "جاري التحديث..." : "تحديث كلمة المرور"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}