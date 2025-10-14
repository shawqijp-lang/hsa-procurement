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
  "map-pin": [],
  "chef-hat": [],
  "droplets": [],
  "utensils": [],
  "package": [],
  building: [
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
    {
      categoryAr: "الاستقبال والردهات",
      categoryEn: "Reception and Lobbies",
      taskAr: "تنظيف منطقة الاستقبال",
      taskEn: "Clean reception area",
      descriptionAr: "تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار",
      descriptionEn: "Clean reception desk, chairs and waiting area",
      multiTasks: [
        { ar: "تنظيف مكتب الاستقبال", en: "Clean reception desk" },
        { ar: "ترتيب منطقة الانتظار", en: "Organize waiting area" },
        { ar: "مسح الكراسي والطاولات", en: "Wipe chairs and tables" }
      ],
      order: 3
    },
    {
      categoryAr: "الاستقبال والردهات",
      categoryEn: "Reception and Lobbies",
      taskAr: "تنظيف الردهات والممرات",
      taskEn: "Clean lobbies and corridors",
      descriptionAr: "مسح وتنظيف أرضيات الردهات وجميع الممرات",
      descriptionEn: "Sweep and clean lobby floors and all corridors",
      multiTasks: [
        { ar: "كنس الأرضيات", en: "Sweep floors" },
        { ar: "مسح الممرات", en: "Mop corridors" },
        { ar: "تنظيف الجدران", en: "Clean walls" }
      ],
      order: 4
    },
    {
      categoryAr: "المكاتب",
      categoryEn: "Offices",
      taskAr: "تنظيف المكاتب الإدارية",
      taskEn: "Clean administrative offices",
      descriptionAr: "تنظيف أسطح المكاتب والكراسي والأرضيات",
      descriptionEn: "Clean desk surfaces, chairs and floors",
      multiTasks: [
        { ar: "مسح أسطح المكاتب", en: "Wipe desk surfaces" },
        { ar: "تنظيف الكراسي", en: "Clean chairs" },
        { ar: "تنظيف الأرضيات", en: "Clean floors" }
      ],
      order: 5
    },
    {
      categoryAr: "المكاتب",
      categoryEn: "Offices",
      taskAr: "تفريغ سلال المهملات وتنظيفها",
      taskEn: "Empty and clean trash bins",
      descriptionAr: "إفراغ جميع سلال المهملات وتنظيفها وتعقيمها",
      descriptionEn: "Empty all trash bins and clean and disinfect them",
      multiTasks: [
        { ar: "إفراغ سلال المهملات", en: "Empty trash bins" },
        { ar: "تنظيف وتعقيم السلال", en: "Clean and disinfect bins" }
      ],
      order: 6
    },
    {
      categoryAr: "دورات المياه",
      categoryEn: "Restrooms",
      taskAr: "تنظيف دورات المياه الرئيسية",
      taskEn: "Clean main restrooms",
      descriptionAr: "تنظيف شامل وتعقيم دورات المياه والمرافق الصحية",
      descriptionEn: "Complete cleaning and disinfection of restrooms and sanitary facilities",
      multiTasks: [
        { ar: "تنظيف المراحيض", en: "Clean toilets" },
        { ar: "تنظيف الأحواض", en: "Clean sinks" },
        { ar: "تعقيم الأسطح", en: "Disinfect surfaces" },
        { ar: "تجديد المستلزمات", en: "Refill supplies" }
      ],
      order: 7
    },
    {
      categoryAr: "دورات المياه",
      categoryEn: "Restrooms",
      taskAr: "تنظيف المرايا والأرضيات",
      taskEn: "Clean mirrors and floors",
      descriptionAr: "تنظيف وتلميع المرايا ومسح أرضيات دورات المياه",
      descriptionEn: "Clean and polish mirrors and mop restroom floors",
      multiTasks: [
        { ar: "تنظيف المرايا", en: "Clean mirrors" },
        { ar: "مسح الأرضيات", en: "Mop floors" }
      ],
      order: 8
    }
  ],

  home: [
    {
      categoryAr: "غرف المعيشة",
      categoryEn: "Living Rooms",
      taskAr: "تنظيف غرفة المعيشة الرئيسية",
      taskEn: "Clean main living room",
      descriptionAr: "تنظيف الأثاث والأرضيات وترتيب المنطقة",
      descriptionEn: "Clean furniture, floors and organize the area",
      multiTasks: [
        { ar: "مسح الأثاث", en: "Dust furniture" },
        { ar: "تنظيف الأرضيات", en: "Clean floors" },
        { ar: "ترتيب الوسائد", en: "Arrange cushions" }
      ],
      order: 1
    },
    {
      categoryAr: "غرف النوم",
      categoryEn: "Bedrooms",
      taskAr: "تنظيف غرف النوم",
      taskEn: "Clean bedrooms",
      descriptionAr: "ترتيب الأسرّة وتنظيف الأرضيات والأثاث",
      descriptionEn: "Make beds and clean floors and furniture",
      multiTasks: [
        { ar: "ترتيب الأسرّة", en: "Make beds" },
        { ar: "تنظيف الطاولات", en: "Clean tables" },
        { ar: "مسح الأرضيات", en: "Sweep floors" }
      ],
      order: 2
    },
    {
      categoryAr: "المطبخ",
      categoryEn: "Kitchen",
      taskAr: "تنظيف المطبخ",
      taskEn: "Clean kitchen",
      descriptionAr: "تنظيف الأسطح والأجهزة والحوض",
      descriptionEn: "Clean surfaces, appliances and sink",
      multiTasks: [
        { ar: "تنظيف الأسطح", en: "Clean countertops" },
        { ar: "تنظيف الحوض", en: "Clean sink" },
        { ar: "مسح الأجهزة", en: "Wipe appliances" }
      ],
      order: 3
    },
    {
      categoryAr: "الحمامات",
      categoryEn: "Bathrooms",
      taskAr: "تنظيف الحمامات",
      taskEn: "Clean bathrooms",
      descriptionAr: "تنظيف وتعقيم جميع المرافق الصحية",
      descriptionEn: "Clean and disinfect all sanitary facilities",
      multiTasks: [
        { ar: "تنظيف المرحاض", en: "Clean toilet" },
        { ar: "تنظيف الحوض", en: "Clean sink" },
        { ar: "تنظيف المرآة", en: "Clean mirror" },
        { ar: "مسح الأرضية", en: "Mop floor" }
      ],
      order: 4
    },
    {
      categoryAr: "النوافذ والأبواب",
      categoryEn: "Windows and Doors",
      taskAr: "تنظيف النوافذ والأبواب",
      taskEn: "Clean windows and doors",
      descriptionAr: "تنظيف الزجاج والإطارات والمقابض",
      descriptionEn: "Clean glass, frames and handles",
      multiTasks: [
        { ar: "تنظيف الزجاج", en: "Clean glass" },
        { ar: "مسح الإطارات", en: "Wipe frames" },
        { ar: "تلميع المقابض", en: "Polish handles" }
      ],
      order: 5
    }
  ],

  "clinic-medical": [
    {
      categoryAr: "منطقة الاستقبال",
      categoryEn: "Reception Area",
      taskAr: "تنظيف منطقة استقبال المرضى",
      taskEn: "Clean patient reception area",
      descriptionAr: "تنظيف وتعقيم منطقة الانتظار ومكتب الاستقبال",
      descriptionEn: "Clean and disinfect waiting area and reception desk",
      multiTasks: [
        { ar: "تعقيم مكتب الاستقبال", en: "Disinfect reception desk" },
        { ar: "تنظيف كراسي الانتظار", en: "Clean waiting chairs" },
        { ar: "تعقيم الأسطح", en: "Disinfect surfaces" }
      ],
      order: 1
    },
    {
      categoryAr: "غرف الفحص",
      categoryEn: "Examination Rooms",
      taskAr: "تنظيف غرف فحص المرضى",
      taskEn: "Clean patient examination rooms",
      descriptionAr: "تنظيف وتعقيم شامل لغرف الفحص والأجهزة الطبية",
      descriptionEn: "Complete cleaning and disinfection of examination rooms and medical equipment",
      multiTasks: [
        { ar: "تعقيم طاولة الفحص", en: "Disinfect examination table" },
        { ar: "تنظيف الأجهزة الطبية", en: "Clean medical equipment" },
        { ar: "تعقيم الأرضيات", en: "Disinfect floors" },
        { ar: "تنظيف الإضاءة", en: "Clean lighting" }
      ],
      order: 2
    },
    {
      categoryAr: "المختبر",
      categoryEn: "Laboratory",
      taskAr: "تنظيف المختبر الطبي",
      taskEn: "Clean medical laboratory",
      descriptionAr: "تنظيف وتعقيم المختبر والأدوات التحليلية",
      descriptionEn: "Clean and disinfect laboratory and analytical tools",
      multiTasks: [
        { ar: "تعقيم أسطح العمل", en: "Disinfect work surfaces" },
        { ar: "تنظيف المعدات", en: "Clean equipment" },
        { ar: "تعقيم الأرضيات", en: "Disinfect floors" }
      ],
      order: 3
    },
    {
      categoryAr: "الصيدلية",
      categoryEn: "Pharmacy",
      taskAr: "تنظيف منطقة الصيدلية",
      taskEn: "Clean pharmacy area",
      descriptionAr: "تنظيف رفوف الأدوية ومنطقة التحضير",
      descriptionEn: "Clean medicine shelves and preparation area",
      multiTasks: [
        { ar: "تنظيف رفوف الأدوية", en: "Clean medicine shelves" },
        { ar: "مسح منطقة التحضير", en: "Wipe preparation area" },
        { ar: "تعقيم الأسطح", en: "Disinfect surfaces" }
      ],
      order: 4
    },
    {
      categoryAr: "المرافق الصحية",
      categoryEn: "Sanitary Facilities",
      taskAr: "تنظيف مرافق المرضى الصحية",
      taskEn: "Clean patient sanitary facilities",
      descriptionAr: "تنظيف وتعقيم شامل للحمامات ومرافق النظافة",
      descriptionEn: "Complete cleaning and disinfection of bathrooms and hygiene facilities",
      multiTasks: [
        { ar: "تعقيم المراحيض", en: "Disinfect toilets" },
        { ar: "تنظيف الأحواض", en: "Clean sinks" },
        { ar: "تعقيم جميع الأسطح", en: "Disinfect all surfaces" },
        { ar: "تجديد المستلزمات الطبية", en: "Refill medical supplies" }
      ],
      order: 5
    }
  ]
};