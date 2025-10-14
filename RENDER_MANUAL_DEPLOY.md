# 🚀 النشر المباشر على Render (بدون GitHub)

## ⚠️ Render Free Tier يتطلب GitHub!

**للأسف، Render لا يدعم رفع الملفات مباشرة في الخطة المجانية.**

---

## ✅ الحلول المتاحة:

### **الحل 1: استخدم Railway بدلاً من Render**

**Railway يدعم الرفع المباشر:**

1. اذهب إلى: https://railway.app
2. سجّل دخول
3. New Project → Deploy from GitHub repo
4. أدخل: `https://github.com/shawqijp-lang/hsa-procurement`
5. أضف Environment Variables

---

### **الحل 2: استخدم Vercel**

**Vercel يدعم رفع الملفات يدوياً:**

1. حمّل Vercel CLI في Replit:
```bash
npm i -g vercel
```

2. سجّل دخول:
```bash
vercel login
```

3. انشر:
```bash
vercel --prod
```

---

### **الحل 3: رفع إلى GitHub من المتصفح (الأفضل)**

**خطوات بسيطة:**

1. اذهب إلى: https://github.com/shawqijp-lang/hsa-procurement

2. انقر "Add file" → "Create new file"

3. اكتب اسم الملف مع المسار الكامل:
   ```
   server/index.ts
   ```

4. افتح الملف من Replit → انسخ المحتوى → الصقه في GitHub

5. Commit changes

6. كرر لكل ملف من القائمة:
   - package.json
   - render.yaml
   - server/index.ts
   - server/db.ts
   - server/routes.ts
   - server/storage.ts
   - server/vite.ts
   - shared/schema.ts
   - كل ملفات client/src/

---

## 💪 الطريقة الأسرع:

**استخدم GitHub Desktop:**

1. حمّل GitHub Desktop على جهازك
2. Clone repository
3. انسخ الملفات من Replit (عبر التحميل ملف بملف)
4. الصقها في المجلد المحلي
5. Commit & Push
6. اربط Render بـ GitHub

---

## ⏱️ الوقت المتوقع:

- Vercel CLI: **2 دقيقة**
- GitHub يدوي: **15 دقيقة**
- GitHub Desktop: **5 دقائق**
