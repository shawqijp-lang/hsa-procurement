# دليل تخصيص شاشة تسجيل الدخول - HSA Group

## 📁 الملفات المطلوبة للتعديل
- `client/src/styles/login.css` - ملف الأنماط الرئيسي
- `client/src/pages/login.tsx` - ملف المكون (لا يحتاج تعديل عادةً)

## 🎨 العناصر القابلة للتخصيص

### 1. الألوان الأساسية
```css
:root {
  --hsa-yellow: #FDE047;        /* اللون الأصفر الأساسي */
  --hsa-yellow-dark: #EAB308;   /* اللون الأصفر الداكن */
  --hsa-black: #000000;         /* اللون الأسود */
  --hsa-gray-900: #111827;      /* رمادي غامق جداً */
}
```

### 2. أحجام العناصر
```css
:root {
  --company-button-size: 56px;    /* حجم زر الشركات */
  --logo-size-mobile: 64px;       /* حجم الشعار في الجوال */
  --logo-size-desktop: 80px;      /* حجم الشعار في الكمبيوتر */
}
```

### 3. التأثيرات والحركة
```css
:root {
  --transition-fast: 0.2s ease;    /* انتقال سريع */
  --transition-normal: 0.3s ease;  /* انتقال عادي */
  --transition-slow: 0.5s ease;    /* انتقال بطيء */
}
```

## 🛠️ التخصيصات الشائعة

### تغيير لون الزر الأصفر
```css
.login-button {
  background: linear-gradient(90deg, #your-color, #your-dark-color);
}

.company-button {
  background: rgba(your-color-rgb, 0.2);
  border: 1px solid rgba(your-color-rgb, 0.3);
}
```

### تغيير حجم زر الشركات العائم
```css
:root {
  --company-button-size: 70px; /* زيادة الحجم */
}
```

### تخصيص الخلفية الهندسية
```css
.pattern-square {
  border-color: #your-color; /* تغيير لون الأشكال الهندسية */
  border-width: 3px;         /* تغيير سماكة الحدود */
}
```

### تغيير شفافية الخلفية
```css
.login-card {
  background: rgba(17, 24, 39, 0.9); /* زيادة الشفافية */
}

.company-dropdown {
  background: rgba(17, 24, 39, 0.98); /* تقليل الشفافية */
}
```

### تخصيص حقول الإدخال
```css
.login-input {
  height: 60px;                    /* زيادة الارتفاع */
  border-radius: 20px;             /* زيادة انحناء الحواف */
  font-size: 20px;                 /* زيادة حجم الخط */
  background: rgba(31, 41, 55, 0.8); /* تغيير الشفافية */
}
```

### تغيير موقع الشعار الافتراضي
```css
.login-header {
  flex-direction: column;     /* ترتيب عمودي */
  text-align: center;         /* محاذاة وسط */
}
```

## 🎯 نصائح للتخصيص

### 1. حفظ نسخة احتياطية
قبل التعديل، احفظ نسخة من الملف الأصلي

### 2. اختبار الألوان
استخدم أدوات اختيار الألوان عبر الإنترنت للحصول على الرموز الصحيحة

### 3. التوافق مع الأجهزة
تأكد من اختبار التغييرات على أحجام شاشات مختلفة

### 4. التباين
تأكد من وجود تباين كافي بين النص والخلفية لسهولة القراءة

## 🔧 أمثلة سريعة للتخصيص

### تغيير اللون إلى الأزرق
```css
:root {
  --hsa-yellow: #3B82F6;
  --hsa-yellow-dark: #1E40AF;
}
```

### تغيير اللون إلى الأخضر
```css
:root {
  --hsa-yellow: #10B981;
  --hsa-yellow-dark: #047857;
}
```

### جعل زر الشركات أكبر وأكثر وضوحاً
```css
:root {
  --company-button-size: 70px;
}

.company-button {
  background: rgba(253, 224, 71, 0.4);
  border: 2px solid rgba(253, 224, 71, 0.6);
}
```

## 📱 تخصيصات خاصة بالجوال
```css
@media (max-width: 640px) {
  .system-title {
    font-size: 16px; /* تصغير العنوان للجوال */
  }
  
  .login-input {
    height: 50px;    /* تقليل ارتفاع الحقول */
    font-size: 16px; /* تقليل حجم الخط */
  }
}
```

---

## 🚀 كيفية التطبيق
1. افتح الملف `client/src/styles/login.css`
2. عدّل القيم المطلوبة
3. احفظ الملف
4. الصفحة ستتحديث تلقائياً

**ملاحظة**: جميع التغييرات ستظهر مباشرة دون الحاجة لإعادة تشغيل الخادم!