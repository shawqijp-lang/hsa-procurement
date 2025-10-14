/**
 * 🔄 محول البيانات للنظام الموحد الجديد
 * يحول بيانات التقييم من النظام القديم للنظام الموحد
 */

import { EvaluationItem, calculateQualityPercent } from '@/../../shared/unifiedEvaluationSchema';

interface OldEvaluationData {
  locationId: number;
  userId: number;
  companyId: number;
  checklistDate: string;
  tasks: Array<{
    templateId: number;
    completed: boolean;
    rating: number;
    notes?: string;
    itemComment?: string;
    subTaskRatings?: Array<{
      rating: number;
      taskName: string;
      taskIndex: number;
    }>;
  }>;
  evaluationNotes?: string;
  finalScore?: number;
}

interface LocationData {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface UserData {
  id: number;
  fullName: string;
}

interface CompanyData {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface TemplateData {
  id: number;
  taskAr: string;
  taskEn: string;
  categoryAr: string;
  categoryEn: string;
}

/**
 * 🔄 تحويل بيانات التقييم القديمة للنظام الموحد الجديد
 */
export async function convertToUnifiedFormat(
  oldEvaluationData: OldEvaluationData,
  locationData: LocationData,
  userData: UserData,
  companyData: CompanyData,
  templatesMap: Map<number, TemplateData>
): Promise<{
  locationId: number;
  locationNameAr: string;
  locationNameEn: string;
  evaluatorId: number;
  evaluatorName: string;
  companyId: number;
  companyNameAr: string;
  companyNameEn: string;
  items: EvaluationItem[];
  generalNotes?: string;
  source: 'online' | 'offline';
}> {

  console.log('🔄 [Adapter] تحويل بيانات التقييم للنظام الموحد:', {
    locationId: oldEvaluationData.locationId,
    locationName: locationData.nameAr,
    tasksCount: oldEvaluationData.tasks.length
  });

  // تحويل المهام للشكل الموحد الجديد
  const unifiedItems: EvaluationItem[] = [];
  
  // تجميع المهام حسب الفئات
  const categorizedTasks = new Map<string, Array<{
    templateId: number;
    taskName: string;
    rating: number;
    comment: string;
    subTasks: Array<{
      taskName: string;
      rating: number;
      comment: string;
      completed: boolean;
    }>;
  }>>();

  // معالجة كل مهمة من النظام القديم
  for (const task of oldEvaluationData.tasks) {
    const template = templatesMap.get(task.templateId);
    if (!template) {
      console.warn(`⚠️ [Adapter] قالب غير موجود: ${task.templateId}`);
      continue;
    }

    const categoryName = template.categoryAr;
    const taskName = template.taskAr;
    
    if (!categorizedTasks.has(categoryName)) {
      categorizedTasks.set(categoryName, []);
    }

    // تحويل المهام الفرعية
    const subTasks = (task.subTaskRatings || []).map(subTask => ({
      taskName: subTask.taskName,
      rating: subTask.rating,
      comment: task.notes || '',
      completed: task.completed
    }));

    categorizedTasks.get(categoryName)!.push({
      templateId: task.templateId,
      taskName: taskName,
      rating: task.rating,
      comment: task.itemComment || task.notes || '',
      subTasks
    });
  }

  // إنشاء عناصر التقييم الموحد
  for (const [categoryName, categoryTasks] of Array.from(categorizedTasks.entries())) {
    for (const task of categoryTasks) {
      const unifiedItem: EvaluationItem = {
        categoryName,
        itemName: task.taskName,
        itemRating: task.rating,
        itemComment: task.comment,
        subTasks: task.subTasks.length > 0 ? task.subTasks : undefined
      };

      unifiedItems.push(unifiedItem);
    }
  }

  console.log(`✅ [Adapter] تم تحويل ${unifiedItems.length} عنصر تقييم موحد`);

  return {
    locationId: oldEvaluationData.locationId,
    locationNameAr: locationData.nameAr,
    locationNameEn: locationData.nameEn,
    evaluatorId: oldEvaluationData.userId,
    evaluatorName: userData.fullName,
    companyId: oldEvaluationData.companyId,
    companyNameAr: companyData.nameAr,
    companyNameEn: companyData.nameEn,
    items: unifiedItems,
    generalNotes: oldEvaluationData.evaluationNotes,
    source: navigator.onLine ? 'online' : 'offline'
  };
}

/**
 * 🎯 جلب بيانات المرجع (المواقع، المستخدمين، الشركات، القوالب)
 */
export async function fetchReferenceData(
  locationId: number,
  userId: number,
  companyId: number
): Promise<{
  location: LocationData;
  user: UserData;
  company: CompanyData;
  templatesMap: Map<number, TemplateData>;
}> {

  console.log('📋 [Adapter] جلب البيانات المرجعية...');

  try {
    // جلب بيانات الموقع
    const locationResponse = await fetch(`/api/locations`);
    const locationsData = await locationResponse.json();
    const locationsArray = Array.isArray(locationsData) ? locationsData : [];
    const location = locationsArray.find((loc: any) => loc.id === locationId);

    // جلب بيانات المستخدم
    const userResponse = await fetch('/api/users');
    const usersData = await userResponse.json();
    const usersArray = Array.isArray(usersData) ? usersData : [];
    const user = usersArray.find((usr: any) => usr.id === userId);

    // جلب بيانات الشركة
    const companyResponse = await fetch('/api/companies');
    const companiesData = await companyResponse.json();
    const companiesArray = Array.isArray(companiesData) ? companiesData : [];
    const company = companiesArray.find((comp: any) => comp.id === companyId);

    // جلب قوالب المهام
    const templatesResponse = await fetch('/api/checklist-templates');
    const templatesData = await templatesResponse.json();
    const templatesArray = Array.isArray(templatesData) ? templatesData : [];
    const templatesMap = new Map<number, TemplateData>();
    templatesArray.forEach((template: any) => {
      templatesMap.set(template.id, {
        id: template.id,
        taskAr: template.taskAr,
        taskEn: template.taskEn,
        categoryAr: template.categoryAr,
        categoryEn: template.categoryEn
      });
    });

    console.log('✅ [Adapter] تم جلب البيانات المرجعية:', {
      location: location?.nameAr,
      user: user?.fullName,
      company: company?.nameAr,
      templatesCount: templatesMap.size
    });

    // التحقق من وجود البيانات المطلوبة
    if (!location) {
      throw new Error(`الموقع غير موجود: ${locationId}`);
    }
    if (!user) {
      throw new Error(`المستخدم غير موجود: ${userId}`);
    }
    if (!company) {
      throw new Error(`الشركة غير موجودة: ${companyId}`);
    }

    return {
      location: {
        id: location.id,
        nameAr: location.nameAr || 'غير محدد',
        nameEn: location.nameEn || 'Not specified'
      },
      user: {
        id: user.id,
        fullName: user.fullName || 'غير محدد'
      },
      company: {
        id: company.id,
        nameAr: company.nameAr || 'غير محدد',
        nameEn: company.nameEn || 'Not specified'
      },
      templatesMap
    };

  } catch (error) {
    console.error('❌ [Adapter] خطأ في جلب البيانات المرجعية:', error);
    throw new Error('فشل في جلب البيانات المرجعية');
  }
}

/**
 * 📊 حساب جودة التقييم كنسبة مئوية (0-100%)
 * تم تحديثها لتستخدم النظام الموحد للجودة
 */
export function calculateUnifiedOverallScore(items: EvaluationItem[]): number {
  // استخدام دالة الجودة الموحدة الجديدة
  return calculateQualityPercent(items);
}

export default {
  convertToUnifiedFormat,
  fetchReferenceData,
  calculateUnifiedOverallScore
};