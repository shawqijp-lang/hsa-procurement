// Default checklist templates for different location types
export interface DefaultChecklistItem {
  categoryAr: string;
  categoryEn: string;
  taskAr: string;
  taskEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  multiTasks: Array<{ar: string, en?: string}>;
  subPoints?: Array<{ar: string, en?: string}>;
  subTasks?: Array<{ar: string, en?: string}>;
  order: number;
}

export const defaultChecklists: Record<string, DefaultChecklistItem[]> = {
  building: [
    // مداخل ومخارج
    {
      categoryAr: "المداخل والمخارج",
      categoryEn: "Entrances and Exits",
      taskAr: "تنظيف المدخل الرئيسي والأبواب",
      taskEn: "Clean main entrance and doors",
      descriptionAr: "تنظيف شامل لأرضية المدخل والأبواب والمقابض",
      descriptionEn: "Complete cleaning of entrance floor, doors and handles",
      multiTasks: [
        { ar: "مسح أرضية المدخل", en: "Mop entrance floor" },
        { ar: "تنظيف الأبواب الزجاجية", en: "Clean glass doors" },
        { ar: "تلميع مقابض الأبواب", en: "Polish door handles" }
      ],
      order: 1
    },
    {
      categoryAr: "المداخل والمخارج",
      categoryEn: "Entrances and Exits",
      taskAr: "تنظيف المداخل الفرعية",
      taskEn: "Clean secondary entrances",
      descriptionAr: "تنظيف وتعقيم جميع المداخل الجانبية والفرعية",
      descriptionEn: "Clean and disinfect all side and secondary entrances",
      multiTasks: [
        { ar: "تنظيف المداخل الجانبية", en: "Clean side entrances" },
        { ar: "تعقيم المقابض والأسطح", en: "Disinfect handles and surfaces" }
      ],
      order: 2
    },
    // الاستقبال والردهات
    {
      categoryAr: "الاستقبال والردهات",
      categoryEn: "Reception and Lobbies",
      taskAr: "تنظيف منطقة الاستقبال",
      taskEn: "Clean reception area",
      descriptionAr: "تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار",
      descriptionEn: "Clean reception desk, chairs and waiting area",
      order: 3
    },
    {
      categoryAr: "الاستقبال والردهات",
      categoryEn: "Reception and Lobbies",
      taskAr: "تنظيف الردهات والممرات",
      taskEn: "Clean lobbies and corridors",
      descriptionAr: "مسح وتنظيف أرضيات الردهات وجميع الممرات",
      descriptionEn: "Sweep and clean lobby floors and all corridors",
      order: 4
    },
    // المكاتب
    {
      categoryAr: "المكاتب",
      categoryEn: "Offices",
      taskAr: "تنظيف المكاتب الإدارية",
      taskEn: "Clean administrative offices",
      descriptionAr: "تنظيف أسطح المكاتب والكراسي والأرضيات",
      descriptionEn: "Clean desk surfaces, chairs and floors",
      order: 5
    },
    {
      categoryAr: "المكاتب",
      categoryEn: "Offices",
      taskAr: "تفريغ سلال المهملات وتنظيفها",
      taskEn: "Empty and clean trash bins",
      descriptionAr: "إفراغ جميع سلال المهملات وتنظيفها وتعقيمها",
      descriptionEn: "Empty all trash bins and clean and disinfect them",
      order: 6
    },
    // دورات المياه
    {
      categoryAr: "دورات المياه",
      categoryEn: "Restrooms",
      taskAr: "تنظيف وتعقيم دورات المياه",
      taskEn: "Clean and disinfect restrooms",
      descriptionAr: "تنظيف شامل وتعقيم المراحيض والأحواض والأرضيات",
      descriptionEn: "Complete cleaning and disinfection of toilets, sinks and floors",
      order: 7
    },
    {
      categoryAr: "دورات المياه",
      categoryEn: "Restrooms",
      taskAr: "تجديد مستلزمات الحمامات",
      taskEn: "Refill bathroom supplies",
      descriptionAr: "تجديد ورق التواليت والصابون والمناشف الورقية",
      descriptionEn: "Refill toilet paper, soap and paper towels",
      order: 8
    },
    // المرافق العامة
    {
      categoryAr: "المرافق العامة",
      categoryEn: "Common Areas",
      taskAr: "تنظيف السلالم والمصاعد",
      taskEn: "Clean stairs and elevators",
      descriptionAr: "تنظيف درجات السلم ومقابض المصاعد وأرضياتها",
      descriptionEn: "Clean stair steps and elevator handles and floors",
      subPoints: [
        { ar: "تنظيف درجات السلم ومقابض المصاعد وأرضياتها", en: "Clean stair steps and elevator handles and floors" }
      ],
      subTasks: [
        { ar: "مسح المقابض", en: "Wipe handles" },
        { ar: "تنظيف النوافذ", en: "Clean windows" }
      ],
      order: 9
    },
    {
      categoryAr: "المرافق العامة",
      categoryEn: "Common Areas",
      taskAr: "تنظيف النوافذ والزجاج",
      taskEn: "Clean windows and glass",
      descriptionAr: "تنظيف جميع النوافذ والأسطح الزجاجية حتى تصبح لامعة",
      descriptionEn: "Clean all windows and glass surfaces until shiny",
      subPoints: [
        { ar: "تنظيف جميع النوافذ والأسطح الزجاجية حتى تصبح لامعة", en: "Clean all windows and glass surfaces until shiny" }
      ],
      subTasks: [
        { ar: "تنظيف النوافذ", en: "Clean windows" }
      ],
      order: 10
    }
  ],

  home: [
    // غرف المعيشة
    {
      categoryAr: "غرف المعيشة",
      categoryEn: "Living Areas",
      taskAr: "تنظيف صالة المعيشة",
      taskEn: "Clean living room",
      descriptionAr: "تنظيف الأثاث والطاولات وكنس وممسح الأرضيات",
      descriptionEn: "Clean furniture, tables and sweep and mop floors",
      order: 1
    },
    {
      categoryAr: "غرف المعيشة",
      categoryEn: "Living Areas",
      taskAr: "تنظيف غرفة الطعام",
      taskEn: "Clean dining room",
      descriptionAr: "تنظيف طاولة الطعام والكراسي وتنظيف الأرضية",
      descriptionEn: "Clean dining table, chairs and floor",
      order: 2
    },
    // غرف النوم
    {
      categoryAr: "غرف النوم",
      categoryEn: "Bedrooms",
      taskAr: "تنظيف غرف النوم",
      taskEn: "Clean bedrooms",
      descriptionAr: "تنظيف الأسرة والطاولات وتنظيم الخزائن",
      descriptionEn: "Clean beds, tables and organize wardrobes",
      order: 3
    },
    {
      categoryAr: "غرف النوم",
      categoryEn: "Bedrooms",
      taskAr: "تغيير ملاءات الأسرة",
      taskEn: "Change bed linens",
      descriptionAr: "تغيير الملاءات والوسائد وتنظيم الأسرة",
      descriptionEn: "Change sheets, pillows and organize beds",
      order: 4
    },
    // المطابخ
    {
      categoryAr: "المطابخ",
      categoryEn: "Kitchens",
      taskAr: "تنظيف المطبخ وأسطح العمل",
      taskEn: "Clean kitchen and work surfaces",
      descriptionAr: "تنظيف أسطح العمل والحوض والمواقد",
      descriptionEn: "Clean work surfaces, sink and stove",
      order: 5
    },
    {
      categoryAr: "المطابخ",
      categoryEn: "Kitchens",
      taskAr: "تنظيف الثلاجة والأجهزة",
      taskEn: "Clean refrigerator and appliances",
      descriptionAr: "تنظيف الثلاجة من الداخل والخارج وتنظيف الأجهزة",
      descriptionEn: "Clean refrigerator inside and outside and clean appliances",
      order: 6
    },
    // الحمامات
    {
      categoryAr: "الحمامات",
      categoryEn: "Bathrooms",
      taskAr: "تنظيف الحمامات والمراحيض",
      taskEn: "Clean bathrooms and toilets",
      descriptionAr: "تنظيف شامل للمراحيض والأحواض والأرضيات",
      descriptionEn: "Complete cleaning of toilets, sinks and floors",
      order: 7
    },
    {
      categoryAr: "الحمامات",
      categoryEn: "Bathrooms",
      taskAr: "تنظيف المرايا والأسطح اللامعة",
      taskEn: "Clean mirrors and shiny surfaces",
      descriptionAr: "تنظيف وتلميع جميع المرايا والأسطح اللامعة",
      descriptionEn: "Clean and polish all mirrors and shiny surfaces",
      order: 8
    },
    // المناطق الخارجية
    {
      categoryAr: "المناطق الخارجية",
      categoryEn: "Outdoor Areas",
      taskAr: "تنظيف الشرفات والبلكونات",
      taskEn: "Clean balconies and terraces",
      descriptionAr: "تنظيف أرضيات الشرفات وإزالة الأتربة",
      descriptionEn: "Clean balcony floors and remove dust",
      order: 9
    },
    {
      categoryAr: "المناطق الخارجية",
      categoryEn: "Outdoor Areas",
      taskAr: "تنظيف المدخل الخارجي",
      taskEn: "Clean outdoor entrance",
      descriptionAr: "تنظيف مدخل المنزل وجمع القمامة من المنطقة",
      descriptionEn: "Clean house entrance and collect trash from area",
      order: 10
    }
  ],

  "clinic-medical": [
    // مناطق الاستقبال
    {
      categoryAr: "منطقة الاستقبال",
      categoryEn: "Reception Area",
      taskAr: "تنظيف وتعقيم مكتب الاستقبال",
      taskEn: "Clean and disinfect reception desk",
      descriptionAr: "تعقيم شامل لسطح المكتب والمقابض والهاتف",
      descriptionEn: "Complete disinfection of desk surface, handles and phone",
      order: 1
    },
    {
      categoryAr: "منطقة الاستقبال",
      categoryEn: "Reception Area",
      taskAr: "تنظيف منطقة انتظار المرضى",
      taskEn: "Clean patient waiting area",
      descriptionAr: "تعقيم الكراسي والطاولات وأرضية منطقة الانتظار",
      descriptionEn: "Disinfect chairs, tables and waiting area floor",
      order: 2
    },
    // غرف الفحص
    {
      categoryAr: "غرف الفحص",
      categoryEn: "Examination Rooms",
      taskAr: "تنظيف وتعقيم أسرة الفحص",
      taskEn: "Clean and disinfect examination beds",
      descriptionAr: "تعقيم شامل لأسرة الفحص وتغيير الأغطية",
      descriptionEn: "Complete disinfection of examination beds and change covers",
      order: 3
    },
    {
      categoryAr: "غرف الفحص",
      categoryEn: "Examination Rooms",
      taskAr: "تعقيم الأجهزة الطبية",
      taskEn: "Disinfect medical equipment",
      descriptionAr: "تعقيم جميع الأجهزة الطبية والأدوات المستخدمة",
      descriptionEn: "Disinfect all medical devices and used instruments",
      order: 4
    },
    // المختبرات
    {
      categoryAr: "المختبرات",
      categoryEn: "Laboratories",
      taskAr: "تنظيف وتعقيم طاولات المختبر",
      taskEn: "Clean and disinfect laboratory tables",
      descriptionAr: "تعقيم خاص لأسطح العمل بالمطهرات المخبرية",
      descriptionEn: "Special disinfection of work surfaces with laboratory disinfectants",
      order: 5
    },
    // الصيدلية
    {
      categoryAr: "الصيدلية",
      categoryEn: "Pharmacy",
      taskAr: "تنظيف أرفف ومنطقة الصيدلية",
      taskEn: "Clean pharmacy shelves and area",
      descriptionAr: "تنظيف الأرفف ومنطقة تحضير الأدوية",
      descriptionEn: "Clean shelves and medicine preparation area",
      order: 6
    },
    // دورات المياه الطبية
    {
      categoryAr: "دورات المياه الطبية",
      categoryEn: "Medical Restrooms",
      taskAr: "تنظيف وتعقيم المراحيض الطبية",
      taskEn: "Clean and disinfect medical toilets",
      descriptionAr: "تعقيم مكثف للمراحيض والأحواض بالمطهرات الطبية",
      descriptionEn: "Intensive disinfection of toilets and sinks with medical disinfectants",
      order: 7
    },
    {
      categoryAr: "دورات المياه الطبية",
      categoryEn: "Medical Restrooms",
      taskAr: "تجديد المستلزمات الطبية للحمامات",
      taskEn: "Refill medical bathroom supplies",
      descriptionAr: "تجديد الصابون المطهر والمناشف والمعقمات",
      descriptionEn: "Refill antiseptic soap, towels and sanitizers",
      order: 8
    },
    // مراكز التعقيم
    {
      categoryAr: "مراكز التعقيم",
      categoryEn: "Sterilization Centers",
      taskAr: "تنظيف أجهزة التعقيم",
      taskEn: "Clean sterilization equipment",
      descriptionAr: "تنظيف وصيانة أجهزة التعقيم والأتوكلاف",
      descriptionEn: "Clean and maintain sterilization equipment and autoclave",
      order: 9
    },
    // إدارة النفايات الطبية
    {
      categoryAr: "إدارة النفايات الطبية",
      categoryEn: "Medical Waste Management",
      taskAr: "جمع النفايات الطبية الخطرة",
      taskEn: "Collect hazardous medical waste",
      descriptionAr: "جمع ونقل النفايات الطبية في حاويات مخصصة",
      descriptionEn: "Collect and transport medical waste in designated containers",
      order: 10
    }
  ],

  "map-pin": [
    // المناطق العامة
    {
      categoryAr: "المناطق العامة",
      categoryEn: "General Areas",
      taskAr: "تنظيف المنطقة الرئيسية",
      taskEn: "Clean main area",
      descriptionAr: "تنظيف شامل للمساحات المفتوحة وإزالة الأتربة",
      descriptionEn: "Complete cleaning of open spaces and dust removal",
      order: 1
    },
    {
      categoryAr: "المناطق العامة",
      categoryEn: "General Areas",
      taskAr: "جمع وإزالة جميع القمامة",
      taskEn: "Collect and remove all trash",
      descriptionAr: "جمع القمامة من جميع أنحاء المنطقة ونقلها للحاويات",
      descriptionEn: "Collect trash from all areas and transport to containers",
      order: 2
    },
    // الأرضيات والممرات
    {
      categoryAr: "الأرضيات والممرات",
      categoryEn: "Floors and Walkways",
      taskAr: "كنس ومسح جميع الأرضيات",
      taskEn: "Sweep and mop all floors",
      descriptionAr: "تنظيف شامل لجميع أنواع الأرضيات بالمواد المناسبة",
      descriptionEn: "Complete cleaning of all floor types with appropriate materials",
      order: 3
    },
    {
      categoryAr: "الأرضيات والممرات",
      categoryEn: "Floors and Walkways",
      taskAr: "تنظيف الممرات والمداخل",
      taskEn: "Clean walkways and entrances",
      descriptionAr: "تنظيف جميع الممرات والمداخل وإزالة العوائق",
      descriptionEn: "Clean all walkways and entrances and remove obstacles",
      order: 4
    },
    // الأسطح والمرافق
    {
      categoryAr: "الأسطح والمرافق",
      categoryEn: "Surfaces and Facilities",
      taskAr: "مسح وتعقيم جميع الأسطح",
      taskEn: "Wipe and disinfect all surfaces",
      descriptionAr: "تنظيف وتعقيم الطاولات والمقاعد والأسطح",
      descriptionEn: "Clean and disinfect tables, benches and surfaces",
      order: 5
    },
    {
      categoryAr: "الأسطح والمرافق",
      categoryEn: "Surfaces and Facilities",
      taskAr: "تنظيف المرافق المشتركة",
      taskEn: "Clean shared facilities",
      descriptionAr: "تنظيف الحمامات العامة والمرافق المشتركة",
      descriptionEn: "Clean public restrooms and shared facilities",
      order: 6
    },
    // النظافة العامة
    {
      categoryAr: "النظافة العامة",
      categoryEn: "General Cleanliness",
      taskAr: "فحص مستوى النظافة العام",
      taskEn: "Inspect overall cleanliness level",
      descriptionAr: "التأكد من تحقيق معايير النظافة المطلوبة",
      descriptionEn: "Ensure required cleanliness standards are met",
      order: 7
    },
    {
      categoryAr: "النظافة العامة",
      categoryEn: "General Cleanliness",
      taskAr: "تعقيم الموقع بالمطهرات",
      taskEn: "Disinfect location with sanitizers",
      descriptionAr: "تطبيق المطهرات على جميع الأسطح للقضاء على الجراثيم",
      descriptionEn: "Apply disinfectants to all surfaces to eliminate germs",
      order: 8
    }
  ]
};