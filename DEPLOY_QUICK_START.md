# 🚀 دليل سريع: نشر التطبيق في 5 دقائق

## الخطوات البسيطة:

### 1️⃣ **إنشاء حساب Railway** (دقيقة واحدة)
👉 https://railway.app
- سجّل دخول بـ GitHub

---

### 2️⃣ **رفع المشروع إلى GitHub** (دقيقتان)

في Replit Shell:
```bash
# أنشئ repository في GitHub أولاً: https://github.com/new
# سمّه: hsa-procurement

# ثم نفذ:
git remote add origin https://github.com/YOUR_USERNAME/hsa-procurement.git
git branch -M main
git push -u origin main
```

---

### 3️⃣ **نشر في Railway** (دقيقة واحدة)
1. في Railway: **New Project**
2. اختر: **Deploy from GitHub repo**
3. اختر: `hsa-procurement`

---

### 4️⃣ **إضافة المتغيرات** (دقيقة واحدة)

في Railway → **Variables**، أضف:

```
DATABASE_URL=postgresql://neondb_owner:npg_wKlPkNBaC5Y4@ep-sparkling-shape-a7ptii27-pooler.ap-southeast-2.aws.neon.tech/neondb
JWT_SECRET=أي_نص_طويل_عشوائي_32_حرف_على_الأقل
NODE_ENV=production
PORT=5000
```

---

### 5️⃣ **جاهز! 🎉**
- Railway سيبني التطبيق تلقائياً
- افتح الرابط: `https://your-app.railway.app`

---

## 📞 تحتاج مساعدة؟
اقرأ الدليل الكامل: `RAILWAY_DEPLOYMENT.md`
