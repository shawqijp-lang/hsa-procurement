# ☁️ دليل Azure السريع - 10 دقائق

## 🚀 الخطوة 1: تحضير التطبيق (دقيقتان)

في Replit Shell، نفذ:

```bash
bash scripts/prepare-azure-deploy.sh
```

سيُنشئ لك ملف `azure-deploy.zip` جاهز للرفع!

---

## 🌐 الخطوة 2: إنشاء App Service (3 دقائق)

### **اذهب إلى:** https://portal.azure.com

1. **ابحث عن:** "App Services"
2. **انقر:** "+ Create" (إنشاء)
3. **املأ:**
   - Resource Group: أنشئ `hsa-group`
   - Name: `hsa-procurement`
   - Runtime: **Node 20 LTS**
   - Region: **West Europe**
   - Plan: **Basic B1** (~$13/شهر)

4. **انقر:** "Review + Create" ثم "Create"

---

## 📤 الخطوة 3: رفع التطبيق (دقيقتان)

### **الطريقة الأسهل - Kudu:**

1. اذهب إلى: `https://hsa-procurement.scm.azurewebsites.net`
   (أو من Azure Portal → App Service → Advanced Tools)

2. انقر: **Tools → Zip Push Deploy**

3. **اسحب وأفلت** ملف `azure-deploy.zip`

4. انتظر حتى يكتمل الرفع (2-3 دقائق)

---

## ⚙️ الخطوة 4: إضافة المتغيرات (دقيقتان)

في Azure Portal → App Service → **Configuration**:

انقر **"New application setting"** لكل متغير:

```
DATABASE_URL
postgresql://neondb_owner:npg_wKlPkNBaC5Y4@ep-sparkling-shape-a7ptii27-pooler.ap-southeast-2.aws.neon.tech/neondb
```

```
JWT_SECRET
اكتب_نص_عشوائي_طويل_32_حرف_على_الاقل
```

```
NODE_ENV
production
```

```
WEBSITE_NODE_DEFAULT_VERSION
~20
```

**احفظ** - Azure سيعيد التشغيل تلقائياً

---

## ✅ الخطوة 5: افتح التطبيق! (10 ثوان)

👉 `https://hsa-procurement.azurewebsites.net`

---

## 🎉 تهانينا!

تطبيقك الآن على Azure يعمل 24/7!

---

## 📞 مشاكل؟

اقرأ الدليل الكامل: `AZURE_DEPLOYMENT.md`
