import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import LoadingSpinner from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, MapPin, Building, Home, Stethoscope, Edit, GripVertical } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

interface Location {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
  description?: string;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const iconOptions = [
  { value: "building", label: "مبنى", icon: Building },
  { value: "home", label: "سكن", icon: Home },
  { value: "clinic-medical", label: "عيادة", icon: Stethoscope },
  { value: "map-pin", label: "موقع عام", icon: MapPin },
];

export default function Locations() {
  const [, setLocation] = useLocation();
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
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
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOffline } = useAuth();

  // Get locations with offline support and fallback - using apiRequest
  const { data: locationsData, isLoading, error, refetch } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
    queryFn: () => apiRequest('/api/locations', 'GET'),
    retry: (failureCount, error) => {
      // Don't retry on authentication errors, but allow data_specialist retries
      if (error?.message?.includes('401') || (error?.message?.includes('403') && !(error?.message?.includes('data_specialist')))) {
        return false;
      }
      return isOffline ? false : (failureCount < 3);
    },
    staleTime: 1000, // Short cache time for fresh data
    gcTime: 24 * 60 * 60 * 1000, // 24 hours cache (replaced cacheTime in v5)
    // Always refetch when component mounts
    refetchOnWindowFocus: navigator.onLine,
    refetchOnReconnect: true,
    refetchOnMount: true,
    // Use offline data as placeholder when offline
    placeholderData: isOffline ? [] : undefined,
  });

  console.log('📍 Locations Query Status:', { 
    isLoading, 
    hasData: !!locationsData, 
    dataLength: Array.isArray(locationsData) ? locationsData.length : 0,
    error: error?.message,
    isOffline 
  });

  // Save locations data when successfully fetched online - simplified offline handling
  useEffect(() => {
    if (locationsData && !isOffline && Array.isArray(locationsData)) {
      // Save to offline storage if needed, but using a simplified approach
      console.log('📍 Locations data loaded:', locationsData.length, 'locations');
    }
  }, [locationsData, isOffline]);

  // Use offline locations if online query failed or when offline
  const displayLocations = locationsData || [];
  
  // Sort locations by orderIndex
  const locations = Array.isArray(displayLocations) ? [...displayLocations].sort((a, b) => a.orderIndex - b.orderIndex) : [];

  console.log('📊 Locations Dashboard Data Status:', { 
    isLoading, 
    locationsData, 
    displayLocations,
    hasData: !!locationsData,
    dataLength: Array.isArray(locationsData) ? locationsData.length : 0,
    locationsLength: locations?.length || 0,
    error: error?.message,
    showLoadingScreen: isLoading && !locationsData
  });

  const createLocationMutation = useMutation({
    mutationFn: async (locationData: any) => {
      return apiRequest('/api/locations', 'POST', locationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setIsAddLocationOpen(false);
      setNewLocation({ nameAr: '', nameEn: '', icon: 'building', description: '' });
      toast({
        title: "تم إضافة الموقع بنجاح",
        description: "تم إنشاء الموقع الجديد",
      });
    },
    onError: (error: any) => {
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



  // Update location order mutation
  const updateLocationOrderMutation = useMutation({
    mutationFn: async (locationsToUpdate: {id: number, orderIndex: number}[]) => {
      return apiRequest('/api/locations/update-order', 'PUT', { locations: locationsToUpdate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      // Also update offline cache
      // updateOfflineLocationsOrder(); // Will be implemented later
      toast({
        title: "تم تحديث ترتيب المواقع",
        description: "تم حفظ الترتيب الجديد بنجاح",
      });
    },
    onError: (error: any) => {
      console.error('Location order update error:', error);
      toast({
        title: "خطأ في تحديث الترتيب",
        description: "تعذر حفظ الترتيب الجديد",
        variant: "destructive",
      });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/locations/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({
        title: "تم حذف الموقع بنجاح",
        description: "تم إزالة الموقع من النظام",
      });
    },
    onError: (error: any) => {
      console.error('Location deletion error:', error);
      toast({
        title: "خطأ في حذف الموقع",
        description: error?.message?.includes('403') || error?.message?.includes('Forbidden') 
          ? "ليس لديك صلاحية لحذف المواقع" 
          : "تعذر حذف الموقع - تحقق من الاتصال بالانترنت",
        variant: "destructive",
      });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      return apiRequest(`/api/locations/${data.id}`, 'PUT', data.updates);
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
    onError: (error: any) => {
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
    // إصلاح مؤقت لمنع جمود UI - استبدال confirm المحجوب
    setTimeout(() => {
      if (confirm(`هل أنت متأكد من حذف موقع "${nameAr}"؟`)) {
        deleteLocationMutation.mutate(id);
      }
    }, 0);
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
    
    console.log('📊 Locations to update:', locationsToUpdate);
    
    // Save to backend and offline
    updateLocationOrderMutation.mutate(locationsToUpdate);
    setDraggedItem(null);
  };

  const getIconComponent = (iconName: string) => {
    const option = iconOptions.find(opt => opt.value === iconName);
    return option ? option.icon : Building;
  };

  // Show loading only when we have no data (not even offline data)
  if (isLoading && locations.length === 0) {
    return (
      <div>
        <main className="container mx-auto px-4 py-6">
          <LoadingSpinner />
          {isOffline && (
            <div className="text-center mt-4 text-yellow-600">
              وضع عدم الاتصال - جاري البحث عن البيانات المحفوظة...
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div>
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              إدارة المواقع
              {isOffline && (
                <span className="text-sm text-yellow-600 mr-2">(غير متصل)</span>
              )}
            </h2>
            <p className="text-gray-600">
              إضافة وتعديل وحذف مواقع التقييم
              {isOffline && (
                <span className="text-yellow-600 mr-2"> - البيانات من التخزين المحلي</span>
              )}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={isAddLocationOpen} onOpenChange={setIsAddLocationOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-yellow hover:bg-yellow-500 text-brand-black">
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة موقع
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
                  <Label>الرمز</Label>
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
                  <Label htmlFor="description">الوصف</Label>
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
                    className="flex-1 bg-brand-yellow hover:bg-yellow-500 text-brand-black"
                  >
                    {createLocationMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black ml-2"></div>
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

        <div className="mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <GripVertical className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-blue-800 font-medium">
                لإعادة ترتيب المواقع: اسحب أي موقع وضعه في المكان المطلوب
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations?.map((location, index) => {
            const IconComponent = getIconComponent(location.icon);
            const isDraggedOver = draggedOverIndex === index;
            const isDragging = draggedItem?.id === location.id;
            
            return (
              <Card 
                key={location.id} 
                className={`cursor-move transition-all duration-200 hover:shadow-lg ${
                  isDraggedOver ? 'ring-2 ring-blue-400 ring-offset-2 bg-blue-50' : ''
                } ${
                  isDragging ? 'opacity-50 scale-95' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, location)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
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
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-900 hover:bg-red-50"
                      onClick={() => handleDeleteLocation(location.id, location.nameAr)}
                      disabled={deleteLocationMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

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
                <Label>الرمز</Label>
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