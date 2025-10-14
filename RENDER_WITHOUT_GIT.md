# 🚀 النشر على Render بدون GitHub

## ✨ الطريقة الأسهل - بدون Git!

---

## 🎯 الطريقة: استخدام Git URL مباشرة

### **الخطوة 1: اذهب إلى Render**

👉 https://dashboard.render.com

---

### **الخطوة 2: إنشاء Web Service**

1. **انقر:** "New +" → **"Web Service"**

2. **اختر:** "Public Git repository"

3. **أدخل Git URL:**
   ```
   https://github.com/shawqijp-lang/hsa-procurement.git
   ```

4. **انقر:** "Continue"

---

### **الخطوة 3: إعدادات Web Service**

| الحقل | القيمة |
|------|--------|
| **Name** | `hsa-procurement` |
| **Region** | Singapore |
| **Branch** | `main` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Plan** | Free |

---

### **الخطوة 4: Environment Variables**

انقر **"Add Environment Variable"**:

```
DATABASE_URL
postgresql://neondb_owner:npg_wKlPkNBaC5Y4@ep-sparkling-shape-a7ptii27-pooler.ap-southeast-2.aws.neon.tech/neondb
```

```
JWT_SECRET
HSA_Procurement_Secret_Key_2024_Very_Long_And_Secure_String_32Plus
```

```
NODE_ENV
production
```

---

### **الخطوة 5: إنشاء**

**انقر:** "Create Web Service"

**انتظر:** 3-5 دقائق للبناء

---

## 🎉 جاهز!

افتح: `https://hsa-procurement.onrender.com`

---

## ⚠️ ملاحظة:

Render سيحاول سحب الكود من GitHub repository العام.
إذا كان Repository خاص، ستحتاج لربط GitHub account.

---

## 🔄 البديل: رفع الكود يدوياً

إذا لم ينجح، يمكنك:

1. تحميل الكود من Replit كـ ZIP
2. رفعه إلى GitHub من المتصفح مباشرة
3. ثم اتباع الخطوات أعلاه

---

## 💡 الحل الأبسط: اجعل Repository عام

في GitHub → Repository Settings → Danger Zone → "Change visibility" → "Make public"

ثم استخدم URL المباشر في Render!
