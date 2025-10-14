# 🔐 المتغيرات البيئية المطلوبة

## 📋 قائمة كاملة بالمتغيرات البيئية:

### **1. قاعدة البيانات (إجباري):**

```env
DATABASE_URL=postgresql://neondb_owner:npg_wKlPkNBaC5Y4@ep-sparkling-shape-a7ptii27-pooler.ap-southeast-2.aws.neon.tech/neondb
```

**الوصف:** رابط الاتصال بقاعدة بيانات Neon PostgreSQL
**المصدر:** من Neon Dashboard → Connection String

---

### **2. الأمان (إجباري):**

```env
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
```

**الوصف:** مفتاح سري لتوقيع JWT tokens
**مهم:** غيّره إلى قيمة عشوائية طويلة (32+ حرف)
**توليد مفتاح عشوائي:**
```bash
openssl rand -base64 32
```

---

### **3. البيئة (إجباري):**

```env
NODE_ENV=production
```

**الوصف:** يحدد بيئة التشغيل
**القيم المسموحة:** `development` أو `production`
**في Railway:** دائماً `production`

---

### **4. المنفذ (إجباري):**

```env
PORT=5000
```

**الوصف:** المنفذ الذي سيعمل عليه التطبيق
**في Railway:** استخدم `5000` أو اتركه فارغاً (Railway يضبطه تلقائياً)

---

### **5. Anthropic AI (اختياري):**

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

**الوصف:** مفتاح API لخدمة Anthropic (إذا كنت تستخدم AI features)
**المصدر:** https://console.anthropic.com/settings/keys
**ملاحظة:** اختياري - فقط إذا كان التطبيق يستخدم ميزات AI

---

## 🎯 كيفية إضافة المتغيرات في Railway:

### **الطريقة 1: من Dashboard (سهلة)**

1. اذهب إلى Railway Dashboard
2. اختر المشروع
3. انقر على **Variables** في القائمة الجانبية
4. انقر **+ New Variable**
5. أضف الاسم والقيمة
6. احفظ

### **الطريقة 2: من Railway CLI (متقدمة)**

```bash
# تثبيت Railway CLI
npm i -g @railway/cli

# تسجيل الدخول
railway login

# ربط المشروع
railway link

# إضافة المتغيرات
railway variables set DATABASE_URL="postgresql://..."
railway variables set JWT_SECRET="your-secret"
railway variables set NODE_ENV="production"
railway variables set PORT="5000"
```

---

## ✅ قائمة تحقق (Checklist):

قبل النشر، تأكد من:

- [ ] `DATABASE_URL` مضاف وصحيح
- [ ] `JWT_SECRET` مضاف (32+ حرف)
- [ ] `NODE_ENV=production`
- [ ] `PORT=5000`
- [ ] `ANTHROPIC_API_KEY` (إذا لزم الأمر)

---

## ⚠️ تحذيرات أمنية:

1. ❌ **لا تضع** المتغيرات في ملف `.env` ثم ترفعه إلى Git
2. ❌ **لا تشارك** `JWT_SECRET` مع أي شخص
3. ❌ **لا تستخدم** نفس `JWT_SECRET` في Development و Production
4. ✅ **احتفظ** بنسخة احتياطية من المتغيرات في مكان آمن (password manager)

---

## 🔄 تحديث المتغيرات:

إذا احتجت لتحديث متغير:

1. Railway Dashboard → Variables
2. انقر على المتغير
3. عدّل القيمة
4. احفظ
5. **Railway سيعيد تشغيل التطبيق تلقائياً**

---

## 📝 مثال كامل للمتغيرات:

```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_wKlPkNBaC5Y4@ep-sparkling-shape-a7ptii27-pooler.ap-southeast-2.aws.neon.tech/neondb

# Security
JWT_SECRET=aBcD1234EfGh5678IjKl9012MnOp3456QrSt7890UvWx
NODE_ENV=production

# Server
PORT=5000

# AI (optional)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
```

---

## 🆘 إذا نسيت إضافة متغير:

**الأعراض:**
- التطبيق لا يبدأ
- Application Error في Railway
- Database connection errors في Logs

**الحل:**
1. تحقق من Railway Logs
2. ابحث عن رسالة خطأ مثل: `DATABASE_URL is not defined`
3. أضف المتغير الناقص
4. Railway سيعيد النشر تلقائياً

---

## 💡 نصيحة احترافية:

احتفظ بملف **خارج Git** يحتوي على جميع المتغيرات:

```
hsa-railway-variables.txt (احفظه في مكان آمن)
==================================
DATABASE_URL=postgresql://...
JWT_SECRET=...
NODE_ENV=production
PORT=5000
ANTHROPIC_API_KEY=...
```

**لا ترفع هذا الملف إلى Git أبداً!**
