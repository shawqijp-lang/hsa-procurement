import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

interface Company {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface LocationEvaluation {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
  status: 'completed' | 'in-progress' | 'not-started';
  progress: number;
  lastEvaluated: string;
  companyId: number;
  companyName: string;
}

export default function CrossCompanyDashboard() {
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  // Fetch all companies
  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/enhanced-gm/companies'],
  });

  // Fetch location evaluations across all companies
  const { data: locationEvaluations, isLoading } = useQuery<LocationEvaluation[]>({
    queryKey: ['/api/enhanced-gm/location-evaluations', selectedCompany],
  });

  const filteredEvaluations = locationEvaluations?.filter(evaluation => 
    selectedCompany === 'all' || evaluation.companyId.toString() === selectedCompany
  ) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-progress': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200 text-green-800';
      case 'in-progress': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'in-progress': return 'قيد التنفيذ';
      default: return 'لم يبدأ';
    }
  };

  // Calculate summary statistics
  const totalLocations = filteredEvaluations.length;
  const completedLocations = filteredEvaluations.filter(evaluation => evaluation.status === 'completed').length;
  const inProgressLocations = filteredEvaluations.filter(evaluation => evaluation.status === 'in-progress').length;
  const averageProgress = totalLocations > 0 
    ? Math.round(filteredEvaluations.reduce((sum, evaluation) => sum + evaluation.progress, 0) / totalLocations)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">جارٍ تحميل تقييمات المواقع...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Company Filter */}
      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              لوحة تحكم تقييم المواقع
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              استعراض تقييمات جميع المواقع عبر شركات المجموعة
            </p>
          </div>
          <div className="flex items-center space-x-4 space-x-reverse">
            <Building2 className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        
        {/* Company Filter */}
        <div className="mt-4 flex items-center">
          <div className="flex items-center space-x-4 space-x-reverse">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              فلتر الشركة:
            </label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="اختر الشركة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الشركات</SelectItem>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.nameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المواقع</CardTitle>
            <MapPin className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalLocations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المواقع المكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedLocations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد التنفيذ</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{inProgressLocations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط التقدم</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{averageProgress}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Locations Grid */}
      {filteredEvaluations.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-48">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                لا توجد مواقع
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {selectedCompany === 'all' 
                  ? 'لا توجد مواقع متاحة حالياً' 
                  : 'لا توجد مواقع في الشركة المختارة'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvaluations.map((evaluation) => (
            <Card key={evaluation.id} className={`border-2 ${getStatusColor(evaluation.status)}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="p-2 rounded-lg bg-white shadow-sm">
                      <span className="text-2xl">{evaluation.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {evaluation.nameAr}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {evaluation.companyName}
                      </p>
                    </div>
                  </div>
                  {getStatusIcon(evaluation.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={getStatusColor(evaluation.status)}>
                      {getStatusText(evaluation.status)}
                    </Badge>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {evaluation.progress}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        evaluation.progress >= 90 ? 'bg-green-500' :
                        evaluation.progress >= 70 ? 'bg-yellow-500' :
                        evaluation.progress >= 50 ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${evaluation.progress}%` }}
                    />
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    آخر تقييم: {new Date(evaluation.lastEvaluated).toLocaleDateString('ar-EG', { calendar: 'gregory' })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
    </div>
  );
}