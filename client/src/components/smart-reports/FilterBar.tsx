import React from 'react';
import { format, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, MapPin, Users, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { Location, User } from '@shared/schema';

interface FilterBarProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  onDateRangeChange: (range: { startDate: string; endDate: string }) => void;
  selectedLocationIds: string[];
  onLocationIdsChange: (ids: string[]) => void;
  selectedUserIds: string[];
  onUserIdsChange: (ids: string[]) => void;
  locations: Location[];
  users: User[];
  onManualSync?: () => void;
  isLoading?: boolean;
}

export default function FilterBar({
  dateRange,
  onDateRangeChange,
  selectedLocationIds,
  onLocationIdsChange,
  selectedUserIds,
  onUserIdsChange,
  locations,
  users,
  onManualSync,
  isLoading = false
}: FilterBarProps) {
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = React.useState(false);
  const [isUserSelectorOpen, setIsUserSelectorOpen] = React.useState(false);

  // فلترة المستخدمين النشطين فقط واستبعاد اخصائي بيانات الشركة
  const filteredUsers = users.filter(user => 
    user.isActive && user.role !== 'data_specialist'
  );

  // حساب إحصائيات الفلاتر
  const selectedLocationsCount = selectedLocationIds.length > 0 ? selectedLocationIds.length : locations.length;
  const selectedUsersCount = selectedUserIds.length > 0 ? selectedUserIds.length : filteredUsers.length;

  // إعدادات نطاق التاريخ السريعة
  const quickRanges = [
    {
      label: 'آخر 7 أيام',
      onClick: () => onDateRangeChange({
        startDate: format(addDays(new Date(), -7), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
      })
    },
    {
      label: 'آخر 30 يوم',
      onClick: () => onDateRangeChange({
        startDate: format(addDays(new Date(), -30), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
      })
    },
    {
      label: 'آخر 90 يوم',
      onClick: () => onDateRangeChange({
        startDate: format(addDays(new Date(), -90), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
      })
    }
  ];

  return (
    <div className="space-y-4">
      {/* شريط الفلاتر العلوي */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              مرشحات التقارير الذكية
            </div>
            {onManualSync && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onManualSync}
                disabled={isLoading}
                data-testid="button-sync"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                تحديث البيانات
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* نطاق التاريخ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">من تاريخ:</label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">إلى تاريخ:</label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
                data-testid="input-end-date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">نطاقات سريعة:</label>
              <div className="flex flex-wrap gap-2">
                {quickRanges.map((range, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={range.onClick}
                    data-testid={`button-range-${index}`}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* ملخص المرشحات */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center" data-testid="filter-summary-period">
              <div className="text-2xl font-bold text-blue-600">{
                Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
              }</div>
              <div className="text-sm text-gray-600">أيام</div>
            </div>
            <div className="text-center" data-testid="filter-summary-locations">
              <div className="text-2xl font-bold text-green-600">{selectedLocationsCount}</div>
              <div className="text-sm text-gray-600">موقع</div>
            </div>
            <div className="text-center" data-testid="filter-summary-users">
              <div className="text-2xl font-bold text-purple-600">{selectedUsersCount}</div>
              <div className="text-sm text-gray-600">مستخدم</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* اختيار المستخدمين */}
      <Card>
        <Collapsible 
          open={isUserSelectorOpen} 
          onOpenChange={setIsUserSelectorOpen}
        >
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  اختيار المستخدمين ({selectedUserIds.length} من {filteredUsers.length})
                </CardTitle>
                {isUserSelectorOpen ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUserIdsChange(filteredUsers.map(user => String(user.id)))}
                  data-testid="button-select-all-users"
                >
                  اختيار الكل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUserIdsChange([])}
                  data-testid="button-clear-users"
                >
                  مسح الاختيار
                </Button>
              </div>
              
              {filteredUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">لا يوجد مستخدمون متاحون</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredUsers.map(user => {
                    const isSelected = selectedUserIds.includes(String(user.id));
                    return (
                      <div
                        key={user.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-400' 
                            : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200'
                        }`}
                        onClick={() => {
                          const userId = String(user.id);
                          if (isSelected) {
                            onUserIdsChange(selectedUserIds.filter(id => id !== userId));
                          } else {
                            onUserIdsChange([...selectedUserIds, userId]);
                          }
                        }}
                        data-testid={`user-${user.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                          <div>
                            <div className="font-medium">{user.fullName}</div>
                            <div className="text-sm text-gray-500">{user.username} - {user.role}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* اختيار المواقع */}
      <Card>
        <Collapsible 
          open={isLocationSelectorOpen} 
          onOpenChange={setIsLocationSelectorOpen}
        >
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  اختيار المواقع ({selectedLocationIds.length} من {locations.length})
                </CardTitle>
                {isLocationSelectorOpen ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLocationIdsChange(locations.map(location => String(location.id)))}
                  data-testid="button-select-all-locations"
                >
                  اختيار الكل
                </Button>
                <Button
                  variant="outline"
                  size="sm" 
                  onClick={() => onLocationIdsChange([])}
                  data-testid="button-clear-locations"
                >
                  مسح الاختيار
                </Button>
              </div>
              
              {locations.length === 0 ? (
                <p className="text-gray-500 text-center py-4">لا توجد مواقع متاحة</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {locations.map(location => {
                    const isSelected = selectedLocationIds.includes(String(location.id));
                    return (
                      <div
                        key={location.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-400' 
                            : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200'
                        }`}
                        onClick={() => {
                          const locationId = String(location.id);
                          if (isSelected) {
                            onLocationIdsChange(selectedLocationIds.filter(id => id !== locationId));
                          } else {
                            onLocationIdsChange([...selectedLocationIds, locationId]);
                          }
                        }}
                        data-testid={`location-${location.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                          <div className="text-2xl">{location.icon}</div>
                          <div>
                            <div className="font-medium">{location.nameAr}</div>
                            <div className="text-sm text-gray-500">{location.nameEn}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}