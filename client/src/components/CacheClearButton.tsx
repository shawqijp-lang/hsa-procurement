import React from "react";

/**
 * مكون مسح الذاكرة المؤقتة - مخفي
 * 
 * تم إخفاء هذا المكون وجعل التنظيف يعمل تلقائياً في الخلفية
 * لا يظهر أي واجهة مستخدم أو أزرار
 * التنظيف التلقائي يتم من خلال safeCacheManager.initAutoCleanup()
 */

const CacheClearButton: React.FC = () => {
  // مكون مخفي - التنظيف يعمل تلقائياً في الخلفية
  // لا يتم عرض أي واجهة مستخدم
  return null;
};

export default CacheClearButton;