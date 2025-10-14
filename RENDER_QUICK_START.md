# ⚡ Render - النشر في 5 دقائق!

## ✨ الأسهل على الإطلاق + آمن 100%

---

## 🚀 الخطوات:

### 1️⃣ **إنشاء حساب (دقيقة واحدة)**

👉 https://render.com
- سجّل دخول بـ GitHub

---

### 2️⃣ **إنشاء Repository (دقيقة واحدة)**

👉 https://github.com/new
- الاسم: `hsa-procurement`
- Private ✅

---

### 3️⃣ **رفع الكود (دقيقة واحدة)**

**في Replit Shell:**

```bash
# إعداد Git (المرة الأولى فقط)
git config user.name "Your Name"
git config user.email "your@email.com"

# إنشاء Token في GitHub
# 👉 https://github.com/settings/tokens/new
# Scopes: ✅ repo

# رفع الكود (استبدل YOUR_TOKEN و YOUR_USERNAME)
git add .
git commit -m "Deploy to Render"
git remote add origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/hsa-procurement.git
git push -u origin main
```

---

### 4️⃣ **النشر في Render (دقيقتان)**

في Render:

1. **New + → Web Service**
2. **Connect repository:** `hsa-procurement`
3. **املأ:**
   - Name: `hsa-procurement`
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Plan: **Free**

4. **Environment Variables:**
   ```
   DATABASE_URL = postgresql://neondb_owner:npg_wKlPkNBaC5Y4@ep-sparkling-shape-a7ptii27-pooler.ap-southeast-2.aws.neon.tech/neondb
   
   JWT_SECRET = نص_عشوائي_طويل_32_حرف
   
   NODE_ENV = production
   ```

5. **Create Web Service**

---

### 5️⃣ **افتح التطبيق! 🎉**

👉 `https://hsa-procurement.onrender.com`

---

## 💰 التكلفة:

✅ **$0** مجاني تماماً!

⚠️ **ملاحظة:** ينام بعد 15 دقيقة، يستيقظ في 30-60 ثانية

---

## 📖 مشاكل؟

اقرأ الدليل الكامل: `RENDER_DEPLOYMENT.md`

---

## 🎯 لماذا Render؟

✅ **الأسهل** - لا CLI معقد  
✅ **آمن** - SSL + secrets تلقائي  
✅ **مجاني** - Free tier ممتاز  
✅ **سريع** - نشر في 5 دقائق!
