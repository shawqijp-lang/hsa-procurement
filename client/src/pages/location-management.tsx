import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import LoadingSpinner from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { Building, Plus, Edit, Trash2, MapPin, Home, Package, ChefHat, Droplets, AlertTriangle, RefreshCw, GripVertical, Search } from "lucide-react";

interface Location {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
  isActive: boolean;
  orderIndex: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

const iconOptions = [
  { value: 'building', label: 'مبنى', icon: Building },
  { value: 'home', label: 'منزل/سكن', icon: Home },
  { value: 'map-pin', label: 'موقع عام', icon: MapPin },
  { value: 'package', label: 'مخزن/مستودع', icon: Package },
  { value: 'chef-hat', label: 'مطبخ', icon: ChefHat },
  { value: 'droplets', label: 'دورات المياه', icon: Droplets },
];

export default function LocationManagement() {
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [draggedItem, setDraggedItem] = useState<Location | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  
  const [newLocation, setNewLocation] = useState({
    nameAr: '',
    nameEn: '',
    icon: 'building',
    description: '',
  });

  const [editLocation, setEditLocation] = useState({
    nameAr: '',
    nameEn: '',
    icon: 'building',
    description: '',
    isActive: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get locations with proper sorting and error handling - using apiRequest
  const { data: locationsData, isLoading, error, refetch } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
    queryFn: () => apiRequest('/api/locations', 'GET'),
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 0, // Never use cache - always fresh data
    gcTime: 0, // Don't keep old data
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Always refetch when component mounts
    refetchInterval: false, // Don't auto-refetch
  });

  // Sort locations by orderIndex for proper display
  const locations = locationsData ? [...locationsData].sort((a, b) => a.orderIndex - b.orderIndex) : [];

  console.log('🏢 Location Management Data Status:', { 
    isLoading, 
    locationsData, 
    hasData: !!locationsData,
    dataLength: Array.isArray(locationsData) ? locationsData.length : 0,
    locationsLength: locations?.length || 0,
    error: error?.message,
    showLoadingScreen: isLoading && !locationsData,
    firstLocation: locationsData?.[0],
    userToken: 'IndexedDB-based' // Token now stored in IndexedDB
  });

  // Handle only actual authentication errors (not permission errors for data_specialist)
  if (error && (error as any)?.message?.includes('401') && !(error as any)?.message?.includes('Access token required')) {
    console.error('Authentication error in location management:', error);
    // إزالة البيانات من كل من IndexedDB و localStorage (بشكل غير متزامن)
    Promise.resolve().then(async () => {
      try {
        const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
        await enhancedIndexedDB.deleteAuthData('auth_token');
        await enhancedIndexedDB.deleteAuthData('user_data');
        await enhancedIndexedDB.deleteAuthData('token');
        await enhancedIndexedDB.deleteAuthData('user');
        console.log('🗑️ Location Management: تم حذف بيانات المصادقة من IndexedDB');
      } catch (error) {
        console.warn('⚠️ فشل في إزالة البيانات من IndexedDB:', error);
        // احتياطي localStorage
        
        
        
        
        console.log('🗑️ Location Management: تم حذف البيانات من localStorage (احتياطي)');
      }
    }).catch(() => {});
    window.location.href = '/login';
    return null;
  }

  // Filter locations based on search
  const filteredLocations = locations.filter(location => 
    location.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.nameEn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (locationData: typeof newLocation) => {
      // 🔄 البحث عن الـ token في IndexedDB أولاً، ثم localStorage
      let token: string | null = null;
      
      try {
        const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
        token = null; // localStorage removed per user requirementawait enhancedIndexedDB.getAuthData('auth_token') || 
                await enhancedIndexedDB.getAuthData('token');
      } catch (error) {
        console.warn('⚠️ فشل في استرجاع الـ token من IndexedDB:', error);
      }
      
      if (!token) {
        token = null; // localStorage removed per user requirement
        
        // ترحيل إلى IndexedDB إذا وجد في localStorage
        if (token) {
          import('@/lib/enhancedIndexedDB').then(({ enhancedIndexedDB }) => {
            enhancedIndexedDB.saveAuthData('auth_token', token).catch(() => {});
          }).catch(() => {});
        }
      }
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(locationData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'خطأ غير معروف' }));
        throw new Error(errorData.message || 'فشل في إضافة الموقع');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setIsAddLocationOpen(false);
      setNewLocation({ nameAr: '', nameEn: '', icon: 'building', description: '' });
      toast({
        title: "تم إضافة الموقع بنجاح",
        description: "تم إنشاء الموقع الجديد وإعداد قوائم التشييك الافتراضية",
      });
    },
    onError: (error: Error) => {
      console.error('Location creation error:', error);
      toast({
        title: "خطأ في إضافة الموقع",
        description: error?.message?.includes('403') || error?.message?.includes('Forbidden') 
          ? "ليس لديك صلاحية لإضافة المواقع" 
          : "تعذر إنشاء الموقع - تحقق من الاتصال بالانترنت",
        variant: "destructive",
      });
    },
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      // 🔄 البحث عن الـ token في IndexedDB أولاً، ثم localStorage
      let token: string | null = null;
      
      try {
        const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
        token = null; // localStorage removed per user requirementawait enhancedIndexedDB.getAuthData('auth_token') || 
                await enhancedIndexedDB.getAuthData('token');
      } catch (error) {
        console.warn('⚠️ فشل في استرجاع الـ token من IndexedDB:', error);
      }
      
      if (!token) {
        token = null; // localStorage removed per user requirement
        
        // ترحيل إلى IndexedDB إذا وجد في localStorage
        if (token) {
          import('@/lib/enhancedIndexedDB').then(({ enhancedIndexedDB }) => {
            enhancedIndexedDB.saveAuthData('auth_token', token).catch(() => {});
          }).catch(() => {});
        }
      }
      const response = await fetch(`/api/locations/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data.updates),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'خطأ غير معروف' }));
        throw new Error(errorData.message || 'فشل في تحديث الموقع');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setIsEditLocationOpen(false);
      setEditingLocation(null);
      toast({
        title: "تم تحديث الموقع بنجاح",
        description: "تم حفظ التغييرات",
      });
    },
    onError: (error: Error) => {
      console.error('Location update error:', error);
      toast({
        title: "خطأ في تحديث الموقع",
        description: error?.message?.includes('403') || error?.message?.includes('Forbidden') 
          ? "ليس لديك صلاحية لتعديل المواقع" 
          : "تعذر تحديث الموقع - تحقق من الاتصال بالانترنت",
        variant: "destructive",
      });
    },
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: number) => {
      // 🔄 البحث عن الـ token في IndexedDB أولاً، ثم localStorage
      let token: string | null = null;
      
      try {
        const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
        token = null; // localStorage removed per user requirementawait enhancedIndexedDB.getAuthData('auth_token') || 
                await enhancedIndexedDB.getAuthData('token');
      } catch (error) {
        console.warn('⚠️ فشل في استرجاع الـ token من IndexedDB:', error);
      }
      
      if (!token) {
        token = null; // localStorage removed per user requirement
        
        // ترحيل إلى IndexedDB إذا وجد في localStorage
        if (token) {
          import('@/lib/enhancedIndexedDB').then(({ enhancedIndexedDB }) => {
            enhancedIndexedDB.saveAuthData('auth_token', token).catch(() => {});
          }).catch(() => {});
        }
      }
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'خطأ غير معروف' }));
        throw new Error(errorData.message || 'فشل في حذف الموقع');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({
        title: "تم حذف الموقع بنجاح",
        description: "تم حذف الموقع من النظام",
      });
    },
    onError: (error: Error) => {
      console.error('Location delete error:', error);
      toast({
        title: "خطأ في حذف الموقع",
        description: error?.message?.includes('403') || error?.message?.includes('Forbidden') 
          ? "ليس لديك صلاحية لحذف المواقع" 
          : "تعذر حذف الموقع - قد يكون هناك بيانات مرتبطة به",
        variant: "destructive",
      });
    },
  });

  // Update location order mutation
  const updateLocationOrderMutation = useMutation({
    mutationFn: async (locationsToUpdate: {id: number, orderIndex: number}[]) => {
      // 🔄 البحث عن الـ token في IndexedDB أولاً، ثم localStorage
      let token: string | null = null;
      
      try {
        const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
        token = null; // localStorage removed per user requirementawait enhancedIndexedDB.getAuthData('auth_token') || 
                await enhancedIndexedDB.getAuthData('token');
      } catch (error) {
        console.warn('⚠️ فشل في استرجاع الـ token من IndexedDB:', error);
      }
      
      if (!token) {
        token = null; // localStorage removed per user requirement
        
        // ترحيل إلى IndexedDB إذا وجد في localStorage
        if (token) {
          import('@/lib/enhancedIndexedDB').then(({ enhancedIndexedDB }) => {
            enhancedIndexedDB.saveAuthData('auth_token', token).catch(() => {});
          }).catch(() => {});
        }
      }
      const response = await fetch('/api/locations/update-order', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ locations: locationsToUpdate }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'خطأ غير معروف' }));
        throw new Error(errorData.message || 'فشل في تحديث ترتيب المواقع');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({
        title: "تم تحديث الترتيب بنجاح",
        description: "تم حفظ الترتيب الجديد للمواقع",
      });
    },
    onError: (error: Error) => {
      console.error('Location order update error:', error);
      toast({
        title: "خطأ في تحديث الترتيب",
        description: "تعذر حفظ الترتيب الجديد",
        variant: "destructive",
      });
    },
  });

  // Handler functions
  const handleCreateLocation = () => {
    if (!newLocation.nameAr || !newLocation.nameEn) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    createLocationMutation.mutate(newLocation);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setEditLocation({
      nameAr: location.nameAr,
      nameEn: location.nameEn,
      icon: location.icon,
      description: location.description || '',
      isActive: location.isActive,
    });
    setIsEditLocationOpen(true);
  };

  const handleUpdateLocation = () => {
    if (!editLocation.nameAr || !editLocation.nameEn) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    if (editingLocation) {
      updateLocationMutation.mutate({
        id: editingLocation.id,
        updates: editLocation
      });
    }
  };

  const handleDeleteLocation = (id: number, nameAr: string) => {
    deleteLocationMutation.mutate(id);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, location: Location) => {
    setDraggedItem(location);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDraggedOverIndex(null);
    
    if (!draggedItem) return;
    
    const dragIndex = locations.findIndex(loc => loc.id === draggedItem.id);
    if (dragIndex === dropIndex) return;
    
    // Create new array with reordered items
    const newLocations = [...locations];
    const [removed] = newLocations.splice(dragIndex, 1);
    newLocations.splice(dropIndex, 0, removed);
    
    // Update order indexes
    const locationsToUpdate = newLocations.map((location, index) => ({
      id: Number(location.id),
      orderIndex: Number(index)
    })).filter(loc => !isNaN(loc.id) && !isNaN(loc.orderIndex));
    
    console.log('📊 تحديث ترتيب المواقع:', locationsToUpdate);
    
    // Save to backend
    updateLocationOrderMutation.mutate(locationsToUpdate);
    setDraggedItem(null);
  };

  const getIconComponent = (iconName: string) => {
    const option = iconOptions.find(opt => opt.value === iconName);
    return option ? option.icon : Building;
  };

  // Show loading only initially, not when data exists
  if (isLoading && !locationsData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-4 py-6">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  // Force show data even if loading continues
  const displayData = locationsData || [];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <main className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="text-center py-16">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">حدث خطأ غير متوقع</h2>
              <p className="text-gray-600 mb-4">نعتذر، حدث خطأ في تحميل المواقع. يرجى إعادة المحاولة.</p>
              <Button 
                onClick={() => refetch()} 
                className="bg-brand-yellow hover:bg-yellow-500 text-brand-black"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                إعادة المحاولة
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      
      <main className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">إدارة المواقع</h2>
            <p className="text-gray-600">إضافة وتعديل وحذف وإعادة ترتيب مواقع التقييم</p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={isAddLocationOpen} onOpenChange={setIsAddLocationOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-yellow hover:bg-yellow-500 text-brand-black">
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة موقع جديد
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة موقع جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nameAr">الاسم بالعربية *</Label>
                    <Input
                      id="nameAr"
                      value={newLocation.nameAr}
                      onChange={(e) => setNewLocation(prev => ({ ...prev, nameAr: e.target.value }))}
                      placeholder="أدخل اسم الموقع بالعربية"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nameEn">الاسم بالإنجليزية *</Label>
                    <Input
                      id="nameEn"
                      value={newLocation.nameEn}
                      onChange={(e) => setNewLocation(prev => ({ ...prev, nameEn: e.target.value }))}
                      placeholder="Enter location name in English"
                      dir="ltr"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="icon">الرمز</Label>
                    <Select value={newLocation.icon} onValueChange={(value) => setNewLocation(prev => ({ ...prev, icon: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {iconOptions.map((option) => {
                          const IconComponent = option.icon;
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                {option.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">الوصف (اختياري)</Label>
                    <Textarea
                      id="description"
                      value={newLocation.description}
                      onChange={(e) => setNewLocation(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="وصف اختياري للموقع"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={handleCreateLocation}
                      disabled={createLocationMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {createLocationMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      ) : (
                        <Plus className="h-4 w-4 ml-2" />
                      )}
                      إضافة الموقع
                    </Button>
                    <Button
                      onClick={() => setIsAddLocationOpen(false)}
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

        {/* Search and Stats */}
        <div className="mb-6 flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث في المواقع..."
              className="pl-10 w-80"
            />
          </div>
          
          <div className="text-sm text-gray-600">
            إجمالي المواقع: <span className="font-semibold text-gray-900">{locations.length}</span>
            {filteredLocations.length !== locations.length && (
              <span> | معروض: <span className="font-semibold text-blue-600">{filteredLocations.length}</span></span>
            )}
          </div>
        </div>

        {/* Debug Info for Development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <p><strong>Debug:</strong> البيانات الخام: {JSON.stringify(locationsData?.slice(0,2))}</p>
            <p><strong>عدد المواقع:</strong> {locations.length} | معروض: {filteredLocations.length}</p>
            <p><strong>أول موقع:</strong> {locations[0]?.nameAr || 'لا يوجد'}</p>
            <p><strong>حالة التحميل:</strong> {isLoading ? 'يحمّل' : 'مكتمل'}</p>
            <p><strong>خطأ:</strong> {(error as any)?.message || 'لا يوجد'}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && locations.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Building className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مواقع</h3>
            <p className="text-gray-500 mb-4">ابدأ بإضافة أول موقع لشركتك</p>
            <Button 
              onClick={() => setIsAddLocationOpen(true)}
              className="bg-brand-yellow hover:bg-yellow-500 text-brand-black"
            >
              <Plus className="h-4 w-4 ml-2" />
              إضافة موقع جديد
            </Button>
          </div>
        )}

        {/* Locations Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLocations.map((location, index) => {
            const IconComponent = getIconComponent(location.icon);
            const isDraggedOver = draggedOverIndex === index;
            const isDragging = draggedItem?.id === location.id;

            return (
              <Card
                key={location.id}
                className={`cursor-move transition-all duration-200 ${
                  isDraggedOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                } ${isDragging ? 'opacity-50 scale-95' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, location)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      <div className="w-12 h-12 bg-brand-yellow rounded-lg flex items-center justify-center">
                        <IconComponent className="h-6 w-6 text-brand-black" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{location.nameAr}</h3>
                        <p className="text-sm text-gray-500" dir="ltr">{location.nameEn}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        location.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {location.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                  </div>
                  
                  {location.description && (
                    <p className="text-sm text-gray-600 mb-4">{location.description}</p>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                      onClick={() => handleEditLocation(location)}
                      disabled={updateLocationMutation.isPending}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-900 hover:bg-red-50"
                          disabled={deleteLocationMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف موقع "{location.nameAr}"؟ 
                            <br />
                            <strong className="text-red-600">تحذير:</strong> سيتم حذف جميع البيانات المرتبطة بهذا الموقع نهائياً.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteLocation(location.id, location.nameAr)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            حذف نهائي
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredLocations.length === 0 && searchTerm && (
          <Card>
            <CardContent className="text-center py-16">
              <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد نتائج</h3>
              <p className="text-gray-600">لم يتم العثور على مواقع تطابق "{searchTerm}"</p>
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm('')} 
                className="mt-4"
              >
                عرض جميع المواقع
              </Button>
            </CardContent>
          </Card>
        )}

        {filteredLocations.length === 0 && !searchTerm && (
          <Card>
            <CardContent className="text-center py-16">
              <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد مواقع</h3>
              <p className="text-gray-600 mb-4">ابدأ بإضافة أول موقع للنظام</p>
              <Button 
                onClick={() => setIsAddLocationOpen(true)}
                className="bg-brand-yellow hover:bg-yellow-500 text-brand-black"
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة موقع جديد
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit Location Dialog */}
        <Dialog open={isEditLocationOpen} onOpenChange={setIsEditLocationOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل الموقع</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editNameAr">الاسم بالعربية *</Label>
                <Input
                  id="editNameAr"
                  value={editLocation.nameAr}
                  onChange={(e) => setEditLocation(prev => ({ ...prev, nameAr: e.target.value }))}
                  placeholder="أدخل اسم الموقع بالعربية"
                />
              </div>
              
              <div>
                <Label htmlFor="editNameEn">الاسم بالإنجليزية *</Label>
                <Input
                  id="editNameEn"
                  value={editLocation.nameEn}
                  onChange={(e) => setEditLocation(prev => ({ ...prev, nameEn: e.target.value }))}
                  placeholder="Enter location name in English"
                  dir="ltr"
                />
              </div>
              
              <div>
                <Label htmlFor="editIcon">الرمز</Label>
                <Select value={editLocation.icon} onValueChange={(value) => setEditLocation(prev => ({ ...prev, icon: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="editDescription">الوصف</Label>
                <Textarea
                  id="editDescription"
                  value={editLocation.description}
                  onChange={(e) => setEditLocation(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="وصف اختياري للموقع"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleUpdateLocation}
                  disabled={updateLocationMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {updateLocationMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  ) : (
                    <Edit className="h-4 w-4 ml-2" />
                  )}
                  حفظ التغييرات
                </Button>
                <Button
                  onClick={() => setIsEditLocationOpen(false)}
                  variant="outline"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}