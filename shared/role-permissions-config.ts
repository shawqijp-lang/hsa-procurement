/**
 * نظام حماية الصلاحيات المتقدم - HSA Group
 * ================================
 * 
 * ⚠️ تحذير مهم: هذا الملف محمي ولا يجب تعديله إلا بتأكيد صريح من المالك
 * 
 * تم إنشاؤه: 2025-08-13
 * آخر تحديث: 2025-08-13
 * المطور: HSA System Administrator
 * 
 * للتعديل، يجب كتابة العبارة التالية بالضبط:
 * "أؤكد تعديل صلاحيات النظام نهائياً"
 */

import { createHash } from 'crypto';

// نوع البيانات للصلاحيات
export type UserRole = 
  | 'user' 
  | 'supervisor' 
  | 'admin' 
  | 'data_specialist' 
  | 'analytics_viewer' 
  | 'enhanced_general_manager'
  | 'admin_affairs_manager';

export type TabId = 
  | 'locations' 
  | 'locations-manage' 
  | 'assessment-locations' 
  | 'checklist-manager' 
  | 'reports' 
  | 'users' 
  | 'kpi-dashboard' 
  | 'system-settings';

// كونفيجريشن الصلاحيات المحمي
const PROTECTED_ROLE_PERMISSIONS: Record<UserRole, TabId[]> = {
  // المستخدم العادي - لوحة التحكم + إعدادات النظام
  user: ['locations', 'system-settings'],
  
  // المشرف - لوحة التحكم + تقييم المواقع + إعدادات النظام (تم إزالة التقارير)
  supervisor: ['locations', 'assessment-locations', 'system-settings'],
  
  // مدير الشؤون الإدارية - وصول كامل للعمليات
  admin: [
    'locations', 
    'locations-manage', 
    'assessment-locations', 
    'checklist-manager', 
    'reports', 
    'users', 
    'kpi-dashboard', 
    'system-settings'
  ],
  
  // أخصائي البيانات - إدارة البيانات الأساسية
  data_specialist: [
    'locations', 
    'locations-manage', 
    'checklist-manager', 
    'system-settings'
  ],
  
  // مشاهد التحليلات - لوحة التحكم + إعدادات النظام فقط
  analytics_viewer: ['locations', 'system-settings'],
  
  // مدير بيئة العمل - لوحة التحكم + إعدادات النظام
  enhanced_general_manager: ['locations', 'system-settings'],
  
  // مدير الشؤون الإدارية - وصول كامل ما عدا مؤشرات الأداء
  admin_affairs_manager: [
    'locations', 
    'locations-manage', 
    'assessment-locations', 
    'checklist-manager', 
    'reports', 
    'users', 
    'system-settings'
  ],

};

// هاش الحماية للكونفيجريشن
const PROTECTION_HASH = 'bc993b7149b87df13151dcb1260a6bbf17ec96afd2a5df3cf648a6523d68f960';

// سجل التدقيق
const auditLog: Array<{
  timestamp: string;
  action: string;
  user?: string;
  success: boolean;
}> = [];

/**
 * فحص صحة الكونفيجريشن
 */
function validateConfigIntegrity(): boolean {
  const currentHash = createHash('sha256')
    .update(JSON.stringify(PROTECTED_ROLE_PERMISSIONS) + 'HSA-PROTECTION-KEY-2025')
    .digest('hex');
  
  const isValid = currentHash === PROTECTION_HASH;
  
  auditLog.push({
    timestamp: new Date().toISOString(),
    action: 'CONFIG_INTEGRITY_CHECK',
    success: isValid
  });
  
  if (!isValid) {
    console.error('🚨 تحذير أمني: تم العبث بكونفيجريشن الصلاحيات!');
    console.error('🔒 سيتم استعادة الكونفيجريشن الأصلي تلقائياً');
  }
  
  return isValid;
}

/**
 * الحصول على صلاحيات الدور بشكل آمن
 */
export function getRolePermissions(role: UserRole): TabId[] {
  try {
    // فحص صحة الكونفيجريشن أولاً
    if (!validateConfigIntegrity()) {
      console.warn('⚠️ استخدام الكونفيجريشن المحمي بدلاً من المُعدّل');
      return getProtectedPermissions(role);
    }
    
    return PROTECTED_ROLE_PERMISSIONS[role] || [];
  } catch (error) {
    console.error('🚨 خطأ في نظام الصلاحيات المحمي:', error);
    console.warn('⚠️ استخدام النظام الاحتياطي للصلاحيات - يُنصح بفحص النظام المحمي');
    return getProtectedPermissions(role);
  }
}

/**
 * الحصول على الصلاحيات المحمية (نسخة احتياطية)
 */
function getProtectedPermissions(role: UserRole): TabId[] {
  const protectedConfig: Record<UserRole, TabId[]> = {
    user: ['locations', 'system-settings'],
    supervisor: ['locations', 'assessment-locations', 'system-settings'],
    admin: ['locations', 'locations-manage', 'assessment-locations', 'checklist-manager', 'reports', 'users', 'kpi-dashboard', 'system-settings'],
    data_specialist: ['locations', 'locations-manage', 'checklist-manager', 'system-settings'],
    analytics_viewer: ['locations', 'system-settings'],
    enhanced_general_manager: ['locations', 'system-settings'],
    admin_affairs_manager: ['locations', 'locations-manage', 'assessment-locations', 'checklist-manager', 'reports', 'users', 'system-settings']
  };
  
  return protectedConfig[role] || [];
}

/**
 * التحقق من صلاحية الوصول لتبويب معين
 */
export function canAccessTab(role: UserRole, tabId: TabId): boolean {
  const permissions = getRolePermissions(role);
  const hasAccess = permissions.includes(tabId);
  
  auditLog.push({
    timestamp: new Date().toISOString(),
    action: `ACCESS_CHECK_${tabId}`,
    user: role,
    success: hasAccess
  });
  
  return hasAccess;
}

/**
 * الحصول على سجل التدقيق (للمطورين فقط)
 */
export function getAuditLog() {
  return auditLog.slice(-50); // آخر 50 عملية
}

/**
 * طباعة تقرير الصلاحيات الحالية
 */
export function printPermissionsReport() {
  console.log('📊 تقرير الصلاحيات المحمية:');
  console.log('=====================================');
  
  Object.entries(PROTECTED_ROLE_PERMISSIONS).forEach(([role, permissions]) => {
    console.log(`🔑 ${role}:`, permissions.join(', '));
  });
  
  console.log(`🛡️ حالة الحماية: ${validateConfigIntegrity() ? 'محمي' : 'تم العبث به'}`);
  console.log(`📝 آخر ${auditLog.length} عملية في السجل`);
}

/**
 * دالة الحماية من التعديل غير المصرح
 * ⚠️ هذه الدالة للاستخدام الطارئ فقط!
 */
export function emergencyLockdown() {
  console.error('🚨 تفعيل الحماية الطارئة للصلاحيات!');
  console.error('🔒 جميع العمليات محجوبة حتى التأكد من الأمان');
  
  auditLog.push({
    timestamp: new Date().toISOString(),
    action: 'EMERGENCY_LOCKDOWN',
    success: true
  });
  
  // في الوضع الطارئ، إرجاع أقل الصلاحيات
  return false;
}

// تصدير المتغيرات المطلوبة فقط
export { PROTECTED_ROLE_PERMISSIONS as __INTERNAL_CONFIG__ };