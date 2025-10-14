-- Create templates for Company 7 locations
-- First check what locations exist for company 7
SELECT id, "nameAr", icon, "companyId" FROM locations WHERE "companyId" = 7;

-- Office template for company 7 locations
INSERT INTO "checklistTemplates" (
  "locationId", 
  "companyId", 
  "categoryAr", 
  "categoryEn", 
  "taskAr", 
  "taskEn", 
  "descriptionAr", 
  "descriptionEn", 
  "multiTasks", 
  "subPoints", 
  "subTasks", 
  "orderIndex", 
  "isActive"
)
SELECT 
  l.id,
  7,
  'المداخل والمخارج',
  'Entrances and Exits',
  'تنظيف المدخل الرئيسي والأبواب',
  'Clean main entrance and doors',
  'تنظيف شامل لأرضية المدخل والأبواب والمقابض',
  'Complete cleaning of entrance floor, doors and handles',
  '[{"ar":"مسح أرضية المدخل","en":"Mop entrance floor"},{"ar":"تنظيف الأبواب الزجاجية","en":"Clean glass doors"},{"ar":"تلميع مقابض الأبواب","en":"Polish door handles"}]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  1,
  true
FROM locations l 
WHERE l."companyId" = 7
AND NOT EXISTS (
  SELECT 1 FROM "checklistTemplates" ct 
  WHERE ct."locationId" = l.id 
  AND ct."companyId" = 7
  AND ct."taskAr" = 'تنظيف المدخل الرئيسي والأبواب'
);

-- Production line template
INSERT INTO "checklistTemplates" (
  "locationId", 
  "companyId", 
  "categoryAr", 
  "categoryEn", 
  "taskAr", 
  "taskEn", 
  "descriptionAr", 
  "descriptionEn", 
  "multiTasks", 
  "subPoints", 
  "subTasks", 
  "orderIndex", 
  "isActive"
)
SELECT 
  l.id,
  7,
  'خطوط الإنتاج',
  'Production Lines',
  'تنظيف خط الإنتاج',
  'Clean production line',
  'تنظيف وصيانة خط الإنتاج',
  'Clean and maintain production line',
  '[{"ar":"تنظيف المعدات","en":"Clean equipment"},{"ar":"فحص الآلات","en":"Inspect machinery"},{"ar":"تنظيف المنطقة المحيطة","en":"Clean surrounding area"}]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  2,
  true
FROM locations l 
WHERE l."companyId" = 7
AND l.icon = '⚙️'
AND NOT EXISTS (
  SELECT 1 FROM "checklistTemplates" ct 
  WHERE ct."locationId" = l.id 
  AND ct."companyId" = 7
  AND ct."taskAr" = 'تنظيف خط الإنتاج'
);

-- Office template
INSERT INTO "checklistTemplates" (
  "locationId", 
  "companyId", 
  "categoryAr", 
  "categoryEn", 
  "taskAr", 
  "taskEn", 
  "descriptionAr", 
  "descriptionEn", 
  "multiTasks", 
  "subPoints", 
  "subTasks", 
  "orderIndex", 
  "isActive"
)
SELECT 
  l.id,
  7,
  'المكاتب',
  'Offices',
  'تنظيف المكاتب الإدارية',
  'Clean administrative offices',
  'تنظيف أسطح المكاتب والكراسي والأرضيات',
  'Clean desk surfaces, chairs and floors',
  '[{"ar":"مسح أسطح المكاتب","en":"Wipe desk surfaces"},{"ar":"تنظيف الكراسي","en":"Clean chairs"},{"ar":"تنظيف الأرضيات","en":"Clean floors"}]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  3,
  true
FROM locations l 
WHERE l."companyId" = 7
AND l.icon = '🏢'
AND NOT EXISTS (
  SELECT 1 FROM "checklistTemplates" ct 
  WHERE ct."locationId" = l.id 
  AND ct."companyId" = 7
  AND ct."taskAr" = 'تنظيف المكاتب الإدارية'
);

-- Cold storage template
INSERT INTO "checklistTemplates" (
  "locationId", 
  "companyId", 
  "categoryAr", 
  "categoryEn", 
  "taskAr", 
  "taskEn", 
  "descriptionAr", 
  "descriptionEn", 
  "multiTasks", 
  "subPoints", 
  "subTasks", 
  "orderIndex", 
  "isActive"
)
SELECT 
  l.id,
  7,
  'التخزين المبرد',
  'Cold Storage',
  'تنظيف منطقة التخزين المبرد',
  'Clean refrigerated storage area',
  'تنظيف وفحص منطقة التخزين المبرد',
  'Clean and inspect refrigerated storage area',
  '[{"ar":"فحص درجة الحرارة","en":"Check temperature"},{"ar":"تنظيف الوحدات","en":"Clean units"},{"ar":"تنظيف الأرضيات","en":"Clean floors"}]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  4,
  true
FROM locations l 
WHERE l."companyId" = 7
AND l.icon = '❄️'
AND NOT EXISTS (
  SELECT 1 FROM "checklistTemplates" ct 
  WHERE ct."locationId" = l.id 
  AND ct."companyId" = 7
  AND ct."taskAr" = 'تنظيف منطقة التخزين المبرد'
);

-- Warehouse template
INSERT INTO "checklistTemplates" (
  "locationId", 
  "companyId", 
  "categoryAr", 
  "categoryEn", 
  "taskAr", 
  "taskEn", 
  "descriptionAr", 
  "descriptionEn", 
  "multiTasks", 
  "subPoints", 
  "subTasks", 
  "orderIndex", 
  "isActive"
)
SELECT 
  l.id,
  7,
  'المستودعات',
  'Warehouses',
  'تنظيف مستودع المواد الخام',
  'Clean raw materials warehouse',
  'تنظيف وترتيب مستودع المواد الخام',
  'Clean and organize raw materials warehouse',
  '[{"ar":"ترتيب المواد","en":"Organize materials"},{"ar":"تنظيف الأرفف","en":"Clean shelves"},{"ar":"مسح الأرضيات","en":"Mop floors"}]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  5,
  true
FROM locations l 
WHERE l."companyId" = 7
AND l.icon = 'home'
AND NOT EXISTS (
  SELECT 1 FROM "checklistTemplates" ct 
  WHERE ct."locationId" = l.id 
  AND ct."companyId" = 7
  AND ct."taskAr" = 'تنظيف مستودع المواد الخام'
);

-- Security template
INSERT INTO "checklistTemplates" (
  "locationId", 
  "companyId", 
  "categoryAr", 
  "categoryEn", 
  "taskAr", 
  "taskEn", 
  "descriptionAr", 
  "descriptionEn", 
  "multiTasks", 
  "subPoints", 
  "subTasks", 
  "orderIndex", 
  "isActive"
)
SELECT 
  l.id,
  7,
  'الحراسة والأمن',
  'Security and Guard',
  'فحص نقطة الحراسة',
  'Inspect security post',
  'فحص وتنظيف نقطة الحراسة الأمنية',
  'Inspect and clean security guard post',
  '[{"ar":"فحص المعدات الأمنية","en":"Check security equipment"},{"ar":"تنظيف المكتب","en":"Clean office"},{"ar":"ترتيب الوثائق","en":"Organize documents"}]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  6,
  true
FROM locations l 
WHERE l."companyId" = 7
AND l.icon = 'building'
AND NOT EXISTS (
  SELECT 1 FROM "checklistTemplates" ct 
  WHERE ct."locationId" = l.id 
  AND ct."companyId" = 7
  AND ct."taskAr" = 'فحص نقطة الحراسة'
);

-- Check what we created
SELECT COUNT(*) as template_count FROM "checklistTemplates" WHERE "companyId" = 7;
SELECT l."nameAr", ct."taskAr", ct."companyId" 
FROM "checklistTemplates" ct 
JOIN locations l ON ct."locationId" = l.id 
WHERE ct."companyId" = 7
ORDER BY l."nameAr", ct."orderIndex";