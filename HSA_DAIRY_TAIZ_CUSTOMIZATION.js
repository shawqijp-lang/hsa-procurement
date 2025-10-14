// تخصيص شركة الألبان والأغذية الوطنية - تعز
// معلومات الشركة والمواقع والقوائم المخصصة

const DAIRY_TAIZ_CONFIG = {
  company: {
    nameAr: "شركة الألبان والأغذية الوطنية - تعز",
    nameEn: "National Dairy & Food Company - Taiz",
    type: "dairy_foods",
    city: "تعز",
    colors: {
      primary: "#2563eb",    // أزرق
      secondary: "#ffffff",   // أبيض
      accent: "#60a5fa",      // أزرق فاتح
      text: "#1e3a8a",       // أزرق داكن
      success: "#10b981",    // أخضر
      warning: "#f59e0b",     // أصفر
      error: "#ef4444"        // أحمر
    }
  },

  // المواقع الموحدة لجميع الشركات (نفس الأسماء الحالية)
  locations: [
    {
      nameAr: "مبنى الإدارة ١",
      nameEn: "Administration Building 1",
      icon: "building",
      description: "المكاتب الإدارية الرئيسية",
      order: 1
    },
    {
      nameAr: "مبنى الإدارة ٢",
      nameEn: "Administration Building 2",
      icon: "building",
      description: "المكاتب الإدارية الثانوية",
      order: 2
    },
    {
      nameAr: "دورات المياه",
      nameEn: "Restrooms",
      icon: "droplets",
      description: "مرافق دورات المياه",
      order: 3
    },
    {
      nameAr: "البيئة الخارجية",
      nameEn: "External Environment",
      icon: "map-pin",
      description: "المناطق الخارجية والحدائق",
      order: 4
    },
    {
      nameAr: "سكن A",
      nameEn: "Residence A",
      icon: "home",
      description: "السكن الأول",
      order: 5
    },
    {
      nameAr: "سكن B",
      nameEn: "Residence B",
      icon: "home",
      description: "السكن الثاني",
      order: 6
    },
    {
      nameAr: "سكن C",
      nameEn: "Residence C",
      icon: "home",
      description: "السكن الثالث",
      order: 7
    },
    {
      nameAr: "المخزن",
      nameEn: "Storage",
      icon: "package",
      description: "مخزن عام",
      order: 8
    },
    {
      nameAr: "العيادة",
      nameEn: "Clinic",
      icon: "clinic-medical",
      description: "العيادة الطبية",
      order: 9
    },
    {
      nameAr: "الصالة الرئيسية",
      nameEn: "Main Hall",
      icon: "building",
      description: "الصالة الرئيسية للفعاليات",
      order: 10
    },
    {
      nameAr: "المطبخ",
      nameEn: "Kitchen",
      icon: "chef-hat",
      description: "المطبخ الرئيسي",
      order: 11
    },
    {
      nameAr: "منطقة الطعام",
      nameEn: "Dining Area",
      icon: "building",
      description: "منطقة تناول الطعام",
      order: 12
    }
  ],

  // المستخدمون الافتراضيون
  defaultUsers: [
    {
      username: "owner",
      password: "owner123",
      fullName: "مدير الشؤون الإدارية - تعز",
      email: "owner@dairy-taiz.com",
      role: "owner"
    },
    {
      username: "supervisor_taiz",
      password: "supervisor123",
      fullName: "مشرف العمليات - تعز",
      email: "supervisor@dairy-taiz.com",
      role: "supervisor"
    },
    {
      username: "quality_inspector",
      password: "quality123",
      fullName: "مفتش الجودة",
      email: "quality@dairy-taiz.com",
      role: "user"
    }
  ],

  // قوائم التحقق المخصصة لشركة الألبان (بنفس أسماء المواقع الموحدة)
  checklistTemplates: {
    // قوائم مبنى الإدارة ١ (تم تخصيصها لتناسب شركة الألبان)
    "مبنى الإدارة ١": [
      {
        categoryAr: "تنظيف خطوط الإنتاج",
        categoryEn: "Production Line Cleaning",
        taskAr: "تنظيف وتعقيم خطوط إنتاج الألبان",
        taskEn: "Clean and sterilize dairy production lines",
        descriptionAr: "تنظيف شامل للأنابيب والخزانات ومعدات الإنتاج",
        descriptionEn: "Comprehensive cleaning of pipes, tanks, and production equipment",
        subTasks: [
          { nameAr: "تنظيف الأنابيب الرئيسية", nameEn: "Clean main pipes" },
          { nameAr: "تعقيم خزانات التخزين", nameEn: "Sterilize storage tanks" },
          { nameAr: "فحص نظافة المعدات", nameEn: "Inspect equipment cleanliness" }
        ]
      },
      {
        categoryAr: "مراقبة درجات الحرارة",
        categoryEn: "Temperature Monitoring",
        taskAr: "فحص ومراقبة درجات حرارة الإنتاج",
        taskEn: "Monitor and check production temperatures",
        descriptionAr: "قياس وتسجيل درجات الحرارة في جميع مراحل الإنتاج",
        descriptionEn: "Measure and record temperatures at all production stages",
        subTasks: [
          { nameAr: "قراءة مقاييس الحرارة", nameEn: "Read temperature gauges" },
          { nameAr: "تسجيل القراءات", nameEn: "Record readings" },
          { nameAr: "التأكد من المعايير", nameEn: "Verify standards compliance" }
        ]
      },
      {
        categoryAr: "السلامة والنظافة العامة",
        categoryEn: "General Safety & Hygiene",
        taskAr: "فحص السلامة والنظافة العامة للمصنع",
        taskEn: "Check general factory safety and hygiene",
        descriptionAr: "فحص شامل لجميع جوانب السلامة والنظافة",
        descriptionEn: "Comprehensive inspection of all safety and hygiene aspects",
        subTasks: [
          { nameAr: "تنظيف الأرضيات", nameEn: "Clean floors" },
          { nameAr: "تعقيم الأسطح", nameEn: "Sterilize surfaces" },
          { nameAr: "فحص معدات السلامة", nameEn: "Check safety equipment" }
        ]
      }
    ],

    // قوائم المخزن (تم تخصيصها لمخازن الألبان)
    "المخزن": [
      {
        categoryAr: "صيانة أنظمة التبريد",
        categoryEn: "Cooling System Maintenance",
        taskAr: "فحص وصيانة أنظمة التبريد والتجميد",
        taskEn: "Inspect and maintain cooling and freezing systems",
        descriptionAr: "فحص دوري لجميع أنظمة التبريد والتجميد",
        descriptionEn: "Regular inspection of all cooling and freezing systems",
        subTasks: [
          { nameAr: "قراءة درجات الحرارة", nameEn: "Read temperatures" },
          { nameAr: "فحص أجهزة التبريد", nameEn: "Check cooling devices" },
          { nameAr: "تسجيل البيانات", nameEn: "Record data" }
        ]
      },
      {
        categoryAr: "تنظيف المخازن",
        categoryEn: "Storage Cleaning",
        taskAr: "تنظيف وترتيب مخازن التبريد",
        taskEn: "Clean and organize cold storage areas",
        descriptionAr: "تنظيف شامل لجميع مناطق التخزين المبرد",
        descriptionEn: "Comprehensive cleaning of all cold storage areas",
        subTasks: [
          { nameAr: "تنظيف الرفوف", nameEn: "Clean shelves" },
          { nameAr: "تنظيف الأرضيات", nameEn: "Clean floors" },
          { nameAr: "إزالة الجليد المتراكم", nameEn: "Remove accumulated ice" }
        ]
      },
      {
        categoryAr: "إدارة المخزون",
        categoryEn: "Inventory Management",
        taskAr: "تنظيم وإدارة مخزون المنتجات",
        taskEn: "Organize and manage product inventory",
        descriptionAr: "ترتيب وفحص جميع المنتجات المخزنة",
        descriptionEn: "Organize and inspect all stored products",
        subTasks: [
          { nameAr: "ترتيب المنتجات", nameEn: "Organize products" },
          { nameAr: "فحص تواريخ الانتهاء", nameEn: "Check expiry dates" },
          { nameAr: "إزالة المنتجات التالفة", nameEn: "Remove damaged products" }
        ]
      }
    ],

    // قوائم العيادة (تم تخصيصها لمعمل مراقبة الجودة)
    "العيادة": [
      {
        categoryAr: "تعقيم المعدات",
        categoryEn: "Equipment Sterilization",
        taskAr: "تعقيم وتنظيف معدات المختبر",
        taskEn: "Sterilize and clean laboratory equipment",
        descriptionAr: "تعقيم شامل لجميع أدوات ومعدات المختبر",
        descriptionEn: "Comprehensive sterilization of all lab tools and equipment",
        subTasks: [
          { nameAr: "تنظيف الأجهزة الدقيقة", nameEn: "Clean precision instruments" },
          { nameAr: "تعقيم الأدوات", nameEn: "Sterilize tools" },
          { nameAr: "فحص معايرة الأجهزة", nameEn: "Check device calibration" }
        ]
      },
      {
        categoryAr: "نظافة المختبر",
        categoryEn: "Laboratory Cleanliness",
        taskAr: "تنظيف وترتيب المختبر",
        taskEn: "Clean and organize laboratory",
        descriptionAr: "تنظيف شامل لجميع مناطق المختبر",
        descriptionEn: "Comprehensive cleaning of all laboratory areas",
        subTasks: [
          { nameAr: "تنظيف طاولات العمل", nameEn: "Clean work tables" },
          { nameAr: "تنظيف الأرضيات", nameEn: "Clean floors" },
          { nameAr: "تنظيم الأدوات والمواد", nameEn: "Organize tools and materials" }
        ]
      }
    ],

    // قوائم الصالة الرئيسية (تم تخصيصها لمنطقة التعبئة والتغليف)
    "الصالة الرئيسية": [
      {
        categoryAr: "صيانة خطوط التعبئة",
        categoryEn: "Packaging Line Maintenance",
        taskAr: "تنظيف وصيانة ماكينات التعبئة",
        taskEn: "Clean and maintain packaging machines",
        descriptionAr: "صيانة دورية لجميع خطوط التعبئة والتغليف",
        descriptionEn: "Regular maintenance of all packaging and wrapping lines",
        subTasks: [
          { nameAr: "تنظيف الماكينات", nameEn: "Clean machines" },
          { nameAr: "فحص الأجزاء المتحركة", nameEn: "Check moving parts" },
          { nameAr: "تشحيم المعدات", nameEn: "Lubricate equipment" }
        ]
      },
      {
        categoryAr: "مراقبة جودة التعبئة",
        categoryEn: "Packaging Quality Control",
        taskAr: "فحص جودة التعبئة والتغليف",
        taskEn: "Inspect packaging and wrapping quality",
        descriptionAr: "فحص دقيق لجودة التعبئة والمواد المستخدمة",
        descriptionEn: "Careful inspection of packaging quality and used materials",
        subTasks: [
          { nameAr: "فحص العبوات", nameEn: "Inspect containers" },
          { nameAr: "فحص الأختام", nameEn: "Check seals" },
          { nameAr: "مراقبة الأوزان", nameEn: "Monitor weights" }
        ]
      }
    ],

    // قوائم منطقة الطعام (تم تخصيصها لمنطقة الاستقبال والشحن)
    "منطقة الطعام": [
      {
        categoryAr: "نظافة منطقة الاستقبال",
        categoryEn: "Receiving Area Cleanliness",
        taskAr: "تنظيف منطقة استقبال المواد الخام",
        taskEn: "Clean raw materials receiving area",
        descriptionAr: "تنظيف شامل لمنطقة استقبال المواد الخام",
        descriptionEn: "Comprehensive cleaning of raw materials receiving area",
        subTasks: [
          { nameAr: "تنظيف منصات التحميل", nameEn: "Clean loading platforms" },
          { nameAr: "تنظيف أرضية المنطقة", nameEn: "Clean area floors" },
          { nameAr: "ترتيب المواد الواردة", nameEn: "Organize incoming materials" }
        ]
      },
      {
        categoryAr: "تنظيم منطقة الشحن",
        categoryEn: "Shipping Area Organization",
        taskAr: "تنظيف وترتيب منطقة شحن المنتجات",
        taskEn: "Clean and organize product shipping area",
        descriptionAr: "ترتيب وتنظيف منطقة شحن المنتجات النهائية",
        descriptionEn: "Organize and clean finished products shipping area",
        subTasks: [
          { nameAr: "ترتيب المنتجات للشحن", nameEn: "Arrange products for shipping" },
          { nameAr: "تنظيف مركبات النقل", nameEn: "Clean transport vehicles" },
          { nameAr: "فحص حالة التغليف", nameEn: "Check packaging condition" }
        ]
      }
    ],

    // قوائم مبنى الإدارة ٢ (مكاتب إدارية إضافية)
    "مبنى الإدارة ٢": [
      {
        categoryAr: "تنظيف المكاتب",
        categoryEn: "Office Cleaning",
        taskAr: "تنظيف وترتيب المكاتب الإدارية",
        taskEn: "Clean and organize administrative offices",
        descriptionAr: "تنظيف شامل لجميع المكاتب الإدارية",
        descriptionEn: "Comprehensive cleaning of all administrative offices",
        subTasks: [
          { nameAr: "تنظيف المكاتب", nameEn: "Clean desks" },
          { nameAr: "تنظيف الأرضيات", nameEn: "Clean floors" },
          { nameAr: "ترتيب الملفات", nameEn: "Organize files" }
        ]
      },
      {
        categoryAr: "صيانة عامة",
        categoryEn: "General Maintenance",
        taskAr: "صيانة عامة للمكاتب والمرافق",
        taskEn: "General maintenance of offices and facilities",
        descriptionAr: "أعمال الصيانة العامة والتنظيف للمكاتب",
        descriptionEn: "General maintenance and cleaning work for offices",
        subTasks: [
          { nameAr: "فحص الإضاءة", nameEn: "Check lighting" },
          { nameAr: "تنظيف النوافذ", nameEn: "Clean windows" },
          { nameAr: "صيانة أجهزة التكييف", nameEn: "Maintain air conditioning" }
        ]
      }
    ]
  }
};

module.exports = DAIRY_TAIZ_CONFIG;