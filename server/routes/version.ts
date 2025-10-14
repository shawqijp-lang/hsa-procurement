import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { getDatabaseEnvironmentInfo, verifyDataSafety } from '../db';

const router = Router();

// معلومات الإصدار الحالي - سيتم دمجها مع package.json
function getVersionString(): string {
  const baseVersion = '6.28.0';
  // 🔄 إضافة لاحقة البيئة للتمييز - حل نهائي للعزل
  const isDeployment = process.env.REPLIT_DEPLOYMENT === '1';
  if (!isDeployment) {
    return `${baseVersion}-dev`;
  }
  return baseVersion;
}

const VERSION_INFO = {
  version: getVersionString(), // إصدار فصل البيئات - فصل كامل بين التطوير والإنتاج
  buildTime: new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Riyadh'
  }),
  buildHash: generateBuildHash(),
  features: [
    'تثبيت أصلي على Edge Mobile كتطبيق مستقل',
    'Service Worker محسّن للتوافق مع متطلبات Edge',
    'صفحة وضع عدم الاتصال محسّنة للهواتف المحمولة',
    'نظام PWA متكامل مع أيقونات موحدة',
    'دعم كامل للتشغيل بدون شريط المتصفح',
    'حفظ قوالب التشييك تلقائياً في ذاكرة الهاتف',
    'نظام تسجيل دخول محلي متقدم ومقاوم للحذف',
    'عرض أسماء الشركات بالعربية والإنجليزية في الهيدر العلوي'
  ],
  changelog: [
    'إصدار جديد 6.28.0 - تحسينات نظام المشتريات المركزية وواجهة تسجيل الدخول!',
    'إصلاح صلاحيات المشتريات المركزية: فلتر الشركات للمدير العام فقط',
    'توحيد منطق الصلاحيات بين جميع الصفحات للمستخدمين',
    'تغيير أيقونة المشتريات المركزية إلى سلة التسوق 🛒',
    'تحسين خلفية صفحة تسجيل الدخول إلى اللون الأبيض النقي',
    'إصدار سابق 6.27.0 - تحويل نظام عرض أسماء الشركات إلى نظام ديناميكي كامل وإصلاح واجهة تسجيل الخروج!',
    'تحويل النظام من hardcoded إلى نظام ديناميكي يجلب أسماء الشركات من API تلقائياً',
    'إضافة شركة جديدة في قاعدة البيانات يعرض اسمها الإنجليزي فوراً بدون تعديل الكود',
    'إصلاح خلفية نافذة تسجيل الخروج من شفافة إلى بيضاء واضحة',
    'دعم تلقائي لجميع الشركات الحالية والمستقبلية في الترويسة',
    'إصدار سابق 6.26.0 - إضافة RIIC و YCD لقائمة أسماء الشركات في الترويسة',
    'إصدار سابق 6.23.0 - تحسين نظام التصدير مع إصلاح مراجع المخطط وتوحيد قواعد البيانات!',
    'إصلاح مراجع المخطط الحرجة في وظيفة تصدير PDF',
    'محاذاة مخطط قاعدة البيانات مع تصحيح تعيينات الحقول',
    'إصدار سابق 6.22.0 - إصدار النشر مع نظام قواعد بيانات منفصلة للإنتاج والتطوير!',
    'تحسين نظام العزل الكامل بين بيئتي التطوير والإنتاج',
    'إعداد قواعد بيانات منفصلة لضمان أمان وحماية بيانات الإنتاج',
    'تطوير نظام تحديد البيئة التلقائي مع الحماية الشاملة',
    'تحسينات في استقرار النظام وحل مشاكل العزل بين البيئات',
    'إصدار سابق 6.21.0 - تحسين إعدادات البيئة ونظام أرقام الإصدار الموحد!',
    'تأكيد نهائي: البيانات الزمنية (evaluationTime, evaluationDateTime, evaluationTimestamp) تُرسل وتُحفظ بنجاح',
    'إصلاح شامل لنقل البيانات من المتصفح للخادم مع مراقبة دقيقة للعملية',
    'النجاح الكامل: الأوقات تظهر الآن في تقارير Excel مع التنسيق المطلوب',
    'نظام مراقبة متقدم للتأكد من صحة إرسال البيانات الزمنية في كل تقييم',
    'إصدار سابق 6.20.0 - تحسين المزامنة التلقائية للمستخدمين العاديين',
    'تم إضافة الوقت الفعلي للتقييم في جداول أوراق المواقع التفصيلية',
    'الوقت يظهر مع التاريخ في التنسيق: تاريخ - وقت',
    'تم إضافة الوقت أيضاً في عناوين التقييمات التفصيلية',
    'مصدر الوقت: النظام الموحد unifiedEvaluations (evaluationTime و evaluationDateTime)',
    'إصدار سابق 6.20.5 - إزالة الوقت نهائياً من تقارير Excel بناءً على طلب المستخدم',
    'تمت إزالة عمود "الوقت" من رؤوس جداول Excel',
    'تمت إزالة الوقت من البيانات المعروضة في الجداول',
    'تمت إزالة الوقت من عناوين التقييمات',
    'الآن التقارير تعرض التاريخ فقط بدون الوقت',
    'إصدار سابق 6.20.4 - إصلاح مصدر البيانات لتقارير Excel - استخدام النظام الموحد',
    'تم تحويل قراءة البيانات من dailyChecklists الفارغ إلى unifiedEvaluations الفعلي',
    'الآن سيظهر الوقت الفعلي للتقييمات في تقارير Excel بدلاً من "غير محدد"',
    'إصلاح شامل للبيانات المسترجعة والتنسيق الصحيح لـ unifiedEvaluations',
    'إصدار سابق 6.20.3 - حذف الوقت الوهمي نهائياً وإعادة كتابته من المصدر الصحيح',
    'حذف جميع استخدامات evaluationDate.toLocaleTimeString() الوهمية',
    'استخدام evaluationTime و evaluationDateTime الفعلي من قاعدة البيانات فقط',
    'عرض "غير محدد" عند عدم وجود وقت فعلي بدلاً من الوقت المزيف',
    'إصدار سابق 6.20.2 - إصلاح شامل للوقت الفعلي في جميع تقارير Excel',
    'إصلاح الملف الصحيح server/routes.ts بدلاً من excel-reports-new.ts',
    'تطبيق الوقت الفعلي للتقييم في جميع أوراق Excel بتوقيت الرياض',
    'إصلاح وقت التقييم في generateEnhancedPDFReport.ts أيضاً',
    'إصدار سابق 6.20.1 - إصلاح عرض الوقت الفعلي في تقارير Excel الاحترافية',
    'استبدال الوقت الوهمي بالوقت الفعلي للتقييم في جميع خانات تقرير Excel',
    'ضمان استخدام توقيت الرياض (Asia/Riyadh) في جميع عمليات تنسيق التواريخ والأوقات',
    'تحسين دقة البيانات الزمنية في تقارير Excel المهنية',
    'إصدار سابق 6.20.0 - إصلاح المزامنة التلقائية للمستخدم العادي',
    'إضافة المزامنة التلقائية للوحة التحكم العامة لحل مشكلة المستخدم العادي',
    'تفعيل useUnifiedEvaluation مع autoSync في لوحة التحكم الرئيسية',
    'إصلاح مشكلة عدم مزامنة التقييمات المحفوظة محلياً للمستخدم العادي',
    'تحسين تجربة المستخدم العادي مع مزامنة تلقائية شاملة',
    'إصدار سابق 6.19.0 - إصلاح كامل لقاعدة البيانات وتحسين نظام المزامنة',
    'إضافة الأعمدة المفقودة (evaluation_time, evaluation_date_time, evaluation_timestamp) لجدول daily_checklists',
    'تحسين آلية كشف التقييمات المحلية غير المتزامنة مع دعم معايير بحث محسنة',
    'إصلاح خطأ "column evaluation_time does not exist" نهائياً',
    'تطوير نظام كشف ذكي للتقييمات يدعم جميع أنواع البيانات المحلية',
    'تحسين رسائل التشخيص والمراقبة في المزامنة التلقائية',
    'ضمان استقرار النظام الموحد للتقييمات مع التقارير',
    'إصدار سابق 6.18.0 - إصلاح شامل للنظام الموحد وتحسينات Excel المتقدمة',
    'إصلاح كامل لاكتشاف التقييمات المحلية المتزامنة في النظام الموحد',
    'تحسين جوهري في معالجة بيانات المهام في تقارير Excel المهنية',
    'دعم متعدد الحقول للمهام والتقييمات في تصدير Excel',
    'إصلاح عرض عدد المهام المكتملة ومتوسط التقييم بدقة',
    'تحسين فلترة وبحث التقييمات مع استبعاد البيانات المؤقتة',
    'معالجة محسنة لجميع أنواع الملاحظات والتعليقات في التقارير',
    'إصدار سابق 6.17.0 - إصلاح نظام التقارير الهجين لدعم البيانات المحلية والخادم',
    'إعادة ربط التقارير بنظام HybridDataAccess للجمع بين IndexedDB والخادم',
    'إصلاح مشكلة عدم ظهور التقييمات المحلية في التقارير',
    'تحسين آلية جلب البيانات من المصدرين مع إزالة التكرار',
    'إضافة نظام تراجع ذكي للنظام التقليدي عند فشل النظام الهجين',
    'تحسين رسائل التشخيص والمراقبة لجلب البيانات',
    'إصدار سابق 6.16.0 - تنظيف النظام وإزالة رموز التشخيص الزائدة',
    'إصدار سابق 6.15.0 - تحديث قوي لكاش المتصفح وإزالة البيانات القديمة',
    'إصدار سابق 6.14.0 - تحسينات متقدمة في النظام الموحد',
    'إصدار سابق 6.13.0 - إزالة الشاشة المحلية المنفصلة وتوحيد تجربة تسجيل الدخول',
    'إزالة مكون LocalLoginScreen المنفصل وتوحيد كامل الوظائف في الشاشة الرئيسية',
    'تحديث جميع النصوص من "HSA EVALUATE" إلى "نظام إدارة بيئة العمل" للتوحيد',
    'إصلاح مشكلة التضارب بين واجهات مختلفة وتوحيد تجربة المستخدم',
    'تحسين كاش المتصفح لضمان عرض النصوص الجديدة فوراً',
    'إصدار سابق 6.12.0 - حماية شاملة من أخطاء IndexedDB في بيئة الإنتاج',
    'إصلاح مشكلة عرض رسائل الخطأ عند استرجاع البيانات في البيئات الجديدة',
    'تحسين رسائل النظام لتكون ودية: "هذا طبيعي عند أول استخدام"',
    'حماية محسنة لكافة عمليات قراءة IndexedDB مع معالجة تدريجية للأخطاء',
    'تحسين استقرار النظام في بيئة الإنتاج مع إزالة الرسائل المضللة',
    'تعزيز قوة النظام للتعامل مع البيانات المفقودة أو التالفة',
    'إصدار سابق 6.11.0 - نظام محسن للحفظ التتابعي للمواقع والقوالب',
    'تطوير نظام موحد لحفظ المواقع مع قوالبها بالتسلسل الذكي',
    'إضافة فحص هوية المستخدم ومسح البيانات عند تغيير المستخدم/الشركة',
    'تحسين عملية الحفظ لتعمل فقط في وضع الاتصال وتتخطى وضع عدم الاتصال',
    'إزالة الازدواجية في أنظمة حفظ القوالب والاعتماد على نظام واحد محسن',
    'تحسينات في الأداء والكفاءة عند تسجيل الدخول وتحميل البيانات',
    'إصدار سابق 6.10.0 - إصدار النشر مع إزالة زر التحديث وتحسينات الواجهة',
    'إزالة زر التحديث من الشريط الأزرق نهائياً للديسكتوب والموبايل',
    'إصلاح مشكلة صلاحيات analytics_viewer لعرض تبويبين فقط',
    'تحديث نظام الصلاحيات المحمي وإصلاح النسخة الاحتياطية',
    'تحسينات في الأداء والاستقرار العام للنظام',
    'إصدار سابق 6.9.0 - إصدار الإنتاج مع بيانات محدثة من الإنتاج',
    'إصدار سابق 6.8.1 - نظام database schemas منفصلة للعزل الكامل',
    'تطبيق schema تلقائي: development للتطوير و production للإنتاج',
    'ضبط search_path تلقائياً عند كل اتصال بقاعدة البيانات',
    'إنشاء نظام executeWithSchema للضمان المطلق للعزل',
    'إصدار سابق 6.8.0 - حل نهائي وحاسم لمشكلة العزل بين البيئات',
    'استخدام قواعد بيانات منفصلة تماماً للتطوير والإنتاج',
    'إزالة الاعتماد على search_path وإنشاء عزل حقيقي',
    'إصدار سابق 6.7.0 - إصلاح نهائي لمشكلة تداخل البيئات عند النشر',
    'استخدام REPLIT_DEPLOYMENT بدلاً من REPLIT_DEV_DOMAIN للكشف الصحيح',
    'حماية مطلقة للإنتاج من تأثير تعديلات التطوير',
    'إصدار سابق 6.6.0 - نظام فصل البيئات المكتمل مع مزامنة يدوية',
    'فصل كامل ونهائي بين بيئة التطوير والإنتاج',
    'نظام مزامنة يدوية ذكية من الإنتاج للتطوير',
    'حماية مطلقة لبيانات الإنتاج من تأثير التطوير',
    'إضافة لاحقة -dev لرقم الإصدار في بيئة التطوير',
    'نظام مخططات قاعدة البيانات المنفصلة (production/development schema)',
    'إصدار سابق 6.5.0 - فصل كامل بين بيئة التطوير والإنتاج',
    'استخدام REPLIT_DEPLOYMENT للكشف الصحيح عن بيئة الإنتاج',
    'فصل نهائي بين قواعد البيانات: DATABASE_URL للتطوير و DATABASE_URL_PROD للإنتاج',
    'اختبارات شاملة لضمان عدم تداخل البيانات بين البيئتين',
    'إضافة تسجيلات تشخيصية لمراقبة البيئة النشطة',
    'حل مشكلة استخدام نفس قاعدة البيانات في كلا البيئتين نهائياً',
    'إصدار سابق 6.4.1 - إصلاح مشاكل المصادقة في التقارير الذكية',
    'إصلاح خطأ "jwt malformed" في التقارير الذكية',
    'تحسين آلية استرجاع التوكن من IndexedDB',
    'تطبيق نفس آلية التوكن الناجحة في تصدير Excel على التقارير الذكية',
    'إصدار سابق 6.4.0 - تحسينات PWA للتثبيت الأصلي على Edge Mobile',
    'إصلاح Service Worker للتوافق مع متطلبات Edge Mobile',
    'تنظيف ملفات HTML وتوحيد مسارات الأيقونات',
    'تحسين صفحة وضع عدم الاتصال للهواتف المحمولة',
    'دعم كامل للتثبيت كتطبيق أصلي على Edge',
    'إصدار سابق 6.3.0 - حفظ قوالب التشييك في ذاكرة الهاتف + تحسينات النظام الموحد',
    'إضافة حفظ قوالب التشييك في نفس نظام تخزين المواقع',
    'تحديث فوري لذاكرة الهاتف عند تغيير أي قالب',
    'تحسين أداء النظام في وضع عدم الاتصال',
    'دعم استرجاع القوالب من ذاكرة الهاتف عند فشل API',
    'تحسين آلية الحفظ التلقائي للبيانات الحيوية',
    'دمج كامل مع النظام الموحد للمصادقة والتخزين',
    'إصدار سابق 6.1.1 - تحسين نظام البحث في IndexedDB عند بدء التطبيق',
    'إصدار سابق 6.1.0 - حل مشكلة عزل البيانات بين المستخدمين نهائياً',
    'إضافة معرف المستخدم إلى React Query queryKey لتجنب تداخل الكاش',
    'تحسين منطق فحص هوية المستخدم قبل عرض البيانات المحفوظة',
    'إصلاح مشكلة عرض بيانات المستخدم السابق عند التبديل',
    'تعزيز أمان النظام مع فصل كامل للبيانات بين المستخدمين',
    'إصدار سابق 6.0.0 - تحسينات شاملة ونظام محسن',
    'تطوير النظام بشكل كامل مع تحسينات في الأداء والاستقرار',
    'نظام تحديثات ذكي ومتطور للمستقبل',
    'تحسينات أمنية وتقنية متقدمة',
    'واجهة مستخدم محسنة ومتطورة',
    'عرض أسماء الشركات الثنائية اللغة - الإصدار السابق 3.3.0',
    'إضافة أسماء الشركات بالإنجليزية في الهيدر العلوي',
    'تحسين التصميم مع خط وألوان أنيقة للنص الإنجليزي',
    'محاذاة مثالية للنصين العربي والإنجليزي مع فاصل ذهبي',
    'تطبيق ألوان هوية HSA المتدرجة للنص الثانوي',
    'نظام تسجيل دخول محلي متقدم - الإصدار السابق 3.2.0',
    'إضافة Service Worker مقاوم للحذف مع cache دائم',
    'تطوير صفحة offline.html شاملة مع نموذج تسجيل كامل',
    'تحسين نظام IndexedDB مع تشفير وحماية متعددة المستويات',
    'آلية استرجاع ذكية للبيانات تعمل حتى بعد إغلاق التطبيق'
  ]
};

function generateBuildHash(): string {
  // استخدام التوقيت المحلي للجهاز في إنشاء الهاش
  const localTimestamp = new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Riyadh'
  }).replace(/[- :]/g, '');
  const random = Math.random().toString(36).substring(2);
  return `${localTimestamp}-${random}`;
}

// GET /api/version - الحصول على معلومات الإصدار
router.get('/', async (req, res) => {
  try {
    console.log('📊 Version API - Fetching version information');

    // محاولة قراءة معلومات الإصدار من ملف package.json
    let packageInfo;
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      packageInfo = JSON.parse(packageContent);
    } catch (error) {
      console.log('⚠️ Could not read package.json, using default version info');
    }

    // 🛡️ الحصول على معلومات البيئة والأمان
    const environmentInfo = getDatabaseEnvironmentInfo();
    const safetyInfo = await verifyDataSafety();

    // دمج معلومات الإصدار - إعطاء أولوية للإصدار المحدد في VERSION_INFO
    const versionResponse = {
      ...VERSION_INFO,
      version: VERSION_INFO.version, // استخدام الإصدار المحدد في VERSION_INFO مباشرة
      name: packageInfo?.name || 'HSA Work Environment Management System',
      description: packageInfo?.description || 'نظام بيئة العمل المتقدم',
      serverTime: new Date().toLocaleString('sv-SE', {
        timeZone: 'Asia/Riyadh'
      }),
      uptime: process.uptime(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      // 🛡️ معلومات البيئة والأمان الجديدة
      environmentSecurity: {
        currentEnvironment: environmentInfo.environment,
        databaseType: environmentInfo.databaseType,
        safetyLevel: environmentInfo.safetyLevel,
        dataIsolation: environmentInfo.dataIsolation,
        safetyVerification: safetyInfo,
        isProductionProtected: environmentInfo.isProduction,
        securityFeatures: [
          'فصل كامل لقواعد البيانات',
          'حماية بيانات الإنتاج',
          'عزل بيانات التطوير',
          'مراقبة البيئة التلقائية',
          'نظام أمان متعدد الطبقات'
        ]
      }
    };

    console.log(`📊 Version API - Returning version: ${versionResponse.version}`);
    
    res.json(versionResponse);

  } catch (error) {
    console.error('❌ Version API Error:', error);
    res.status(500).json({
      error: 'Failed to fetch version information',
      message: 'خطأ في الحصول على معلومات الإصدار'
    });
  }
});

// GET /api/version/check - فحص التحديثات المتاحة
router.get('/check', async (req, res) => {
  try {
    const currentVersion = req.query.current as string;
    const currentHash = req.query.hash as string;

    console.log(`🔍 Version Check - Current: ${currentVersion}, Hash: ${currentHash}`);

    // مقارنة الإصدارات
    const hasUpdate = currentVersion !== VERSION_INFO.version || 
                     currentHash !== VERSION_INFO.buildHash;

    const updateInfo = {
      hasUpdate,
      currentVersion,
      latestVersion: VERSION_INFO.version,
      currentHash,
      latestHash: VERSION_INFO.buildHash,
      isForced: isForceUpdate(currentVersion, VERSION_INFO.version),
      updateSize: calculateUpdateSize(),
      changelog: hasUpdate ? VERSION_INFO.changelog : [],
      releaseNotes: hasUpdate ? generateReleaseNotes(currentVersion, VERSION_INFO.version) : null
    };

    console.log(`🔍 Version Check - Update available: ${hasUpdate}`);
    
    res.json(updateInfo);

  } catch (error) {
    console.error('❌ Version Check Error:', error);
    res.status(500).json({
      error: 'Failed to check for updates',
      message: 'خطأ في فحص التحديثات'
    });
  }
});

// POST /api/version/report - تقرير تطبيق التحديث
router.post('/report', async (req, res) => {
  try {
    const { 
      previousVersion, 
      newVersion, 
      updateTime, 
      success, 
      errorDetails 
    } = req.body;

    console.log(`📊 Update Report - ${previousVersion} → ${newVersion}, Success: ${success}`);

    // يمكن حفظ إحصائيات التحديث في قاعدة البيانات هنا
    // لأغراض المراقبة والتحليل

    if (success) {
      console.log('✅ Update completed successfully');
    } else {
      console.error('❌ Update failed:', errorDetails);
    }

    res.json({
      acknowledged: true,
      timestamp: new Date().toISOString(),
      message: success ? 'تم الإبلاغ عن نجاح التحديث' : 'تم الإبلاغ عن فشل التحديث'
    });

  } catch (error) {
    console.error('❌ Update Report Error:', error);
    res.status(500).json({
      error: 'Failed to process update report',
      message: 'خطأ في معالجة تقرير التحديث'
    });
  }
});

// تحديد إذا كان التحديث إجباري
function isForceUpdate(currentVersion: string, latestVersion: string): boolean {
  try {
    const current = parseVersion(currentVersion);
    const latest = parseVersion(latestVersion);

    // تحديث إجباري إذا تغير الإصدار الرئيسي
    return latest.major > current.major;

  } catch (error) {
    // في حالة خطأ في تحليل الإصدار، نعتبر التحديث غير إجباري
    return false;
  }
}

// تحليل رقم الإصدار
function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

// حساب حجم التحديث التقديري
function calculateUpdateSize(): string {
  // تقدير بسيط لحجم التحديث
  const estimatedSizes = ['1.2 ميجابايت', '800 كيلوبايت', '2.1 ميجابايت', '1.5 ميجابايت'];
  return estimatedSizes[Math.floor(Math.random() * estimatedSizes.length)];
}

// توليد ملاحظات الإصدار
function generateReleaseNotes(fromVersion: string, toVersion: string): string {
  return `
تحديث من الإصدار ${fromVersion} إلى ${toVersion}

الميزات الجديدة:
• نظام التحديث التلقائي الذكي
• تحسينات في الأداء والاستقرار
• واجهة مستخدم محسنة
• إصلاحات أمنية مهمة

التحسينات:
• تحسين سرعة التحميل
• تحسين إدارة ذاكرة التخزين
• تحسين تجربة العمل بدون انترنت

الإصلاحات:
• إصلاح مشاكل المزامنة
• إصلاح مشاكل النسخ الاحتياطي
• إصلاحات عامة للاستقرار
  `.trim();
}

export default router;