# 🎯 دليل النشر على Azure App Service

## ✅ المتطلبات المُنجزة:
- ✅ قاعدة البيانات جاهزة على Neon PostgreSQL
- ✅ البيانات منقولة بنجاح (8 شركات، 21 مستخدم، 40 موقع، 229 قالب)
- ✅ التطبيق جاهز للنشر

---

## 📋 خطوات النشر على Azure:

### **الطريقة 1: النشر المباشر من Azure Portal (الأسهل)**

#### **الخطوة 1: بناء التطبيق**

في Replit Shell، نفذ:

```bash
npm run build
```

انتظر حتى ينتهي البناء (2-3 دقائق)

---

#### **الخطوة 2: إنشاء ملف Zip للنشر**

```bash
# إنشاء مجلد للنشر
mkdir -p deploy-package

# نسخ الملفات المطلوبة
cp -r dist deploy-package/
cp -r node_modules deploy-package/
cp package.json deploy-package/
cp web.config deploy-package/

# إنشاء zip
cd deploy-package
zip -r ../azure-deploy.zip .
cd ..

echo "✅ ملف azure-deploy.zip جاهز للتحميل!"
```

---

#### **الخطوة 3: إنشاء App Service في Azure Portal**

1. **اذهب إلى:** https://portal.azure.com
2. **انقر:** "Create a resource" (إنشاء مورد)
3. **ابحث عن:** "Web App"
4. **انقر:** "Create" (إنشاء)

**املأ المعلومات:**

| الحقل | القيمة |
|------|--------|
| **Subscription** | اختر اشتراكك |
| **Resource Group** | أنشئ جديد: `hsa-group` |
| **Name** | `hsa-procurement` (سيكون: hsa-procurement.azurewebsites.net) |
| **Publish** | Code (كود) |
| **Runtime stack** | Node 20 LTS |
| **Operating System** | Windows أو Linux (Windows أسهل) |
| **Region** | West Europe (أو الأقرب لك) |
| **Pricing Plan** | Basic B1 (~$13/شهر) أو Free F1 إذا متوفر |

5. **انقر:** "Review + Create"
6. **انقر:** "Create"
7. **انتظر** 2-3 دقائق حتى يكتمل النشر

---

#### **الخطوة 4: رفع التطبيق**

بعد إنشاء App Service:

1. اذهب إلى App Service الذي أنشأته
2. في القائمة الجانبية، اختر **"Deployment Center"** (مركز النشر)
3. اختر **"Local Git"** أو **"FTPS"**
4. أو الأسهل: استخدم **"ZIP Deploy"**

##### **استخدام ZIP Deploy (الأسهل):**

في Azure Portal → App Service:

1. افتح **"Advanced Tools (Kudu)"**
   - أو اذهب مباشرة إلى: `https://hsa-procurement.scm.azurewebsites.net`
2. انقر على **"Tools" → "Zip Push Deploy"**
3. اسحب ملف `azure-deploy.zip` وأفلته
4. انتظر حتى يكتمل الرفع

---

#### **الخطوة 5: إضافة المتغيرات البيئية**

في Azure Portal → App Service → **Configuration** → **Application settings**:

انقر **"New application setting"** وأضف:

```
DATABASE_URL
postgresql://neondb_owner:npg_wKlPkNBaC5Y4@ep-sparkling-shape-a7ptii27-pooler.ap-southeast-2.aws.neon.tech/neondb

JWT_SECRET
نص_عشوائي_طويل_32_حرف_على_الأقل

NODE_ENV
production

PORT
8080

WEBSITE_NODE_DEFAULT_VERSION
~20
```

**احفظ التغييرات** - Azure سيعيد تشغيل التطبيق تلقائياً

---

#### **الخطوة 6: التحقق من التطبيق**

افتح:
👉 `https://hsa-procurement.azurewebsites.net`

---

### **الطريقة 2: النشر عبر Azure CLI (متقدم)**

إذا كان لديك Azure CLI مثبت:

```bash
# تسجيل الدخول
az login

# إنشاء Resource Group
az group create --name hsa-group --location westeurope

# إنشاء App Service Plan
az appservice plan create \
  --name hsa-plan \
  --resource-group hsa-group \
  --sku B1 \
  --is-linux

# إنشاء Web App
az webapp create \
  --name hsa-procurement \
  --resource-group hsa-group \
  --plan hsa-plan \
  --runtime "NODE:20-lts"

# إعداد المتغيرات
az webapp config appsettings set \
  --name hsa-procurement \
  --resource-group hsa-group \
  --settings \
    DATABASE_URL="postgresql://neondb_owner:npg_wKlPkNBaC5Y4@ep-sparkling-shape-a7ptii27-pooler.ap-southeast-2.aws.neon.tech/neondb" \
    JWT_SECRET="your-secret-key" \
    NODE_ENV="production"

# نشر التطبيق
az webapp deployment source config-zip \
  --name hsa-procurement \
  --resource-group hsa-group \
  --src azure-deploy.zip
```

---

## 🔧 إعدادات إضافية:

### **1. تفعيل Logs:**

في Azure Portal → App Service → **Monitoring** → **App Service logs**:
- Application Logging: **File System**
- Web Server Logging: **File System**
- Detailed Error Messages: **On**

### **2. Domain مخصص:**

في Azure Portal → App Service → **Custom domains**:
- أضف Domain الخاص بك
- اتبع التعليمات لإضافة DNS records

### **3. SSL/TLS:**

Azure يوفر SSL مجاني تلقائياً لـ `*.azurewebsites.net`

للـ Custom Domain:
- استخدم **Managed Certificate** (مجاني)
- أو ارفع شهادتك الخاصة

---

## 💰 التكلفة المتوقعة:

| الخدمة | السعر الشهري |
|--------|-------------|
| **Neon PostgreSQL** | $0 (مجاني) |
| **Azure App Service (B1)** | ~$13 |
| **Azure App Service (F1 Free)** | $0 (محدود) |
| **المجموع** | $13 أو $0 |

### **Free Tier (F1) القيود:**
- ✅ 1 GB Storage
- ✅ 165 MB Memory
- ⚠️ 60 دقيقة CPU يومياً
- ⚠️ يتوقف بعد 20 دقيقة من عدم النشاط

### **Basic Tier (B1) المزايا:**
- ✅ 10 GB Storage
- ✅ 1.75 GB Memory
- ✅ عمل مستمر 24/7
- ✅ Custom domains
- ✅ SSL مجاني

---

## 🎯 بعد النشر:

### **1. مراقبة الأداء:**

في Azure Portal → App Service:
- **Metrics**: CPU, Memory, Requests
- **Logs**: Live logs and historical logs
- **Application Insights**: (اختياري) تحليلات متقدمة

### **2. التحديثات:**

```bash
# بناء جديد
npm run build

# إنشاء zip جديد
# (نفس الخطوات السابقة)

# رفع عبر Kudu أو Azure CLI
```

### **3. Scaling:**

إذا احتجت المزيد من الموارد:
- **Scale Up**: ترقية الـ Pricing Tier
- **Scale Out**: إضافة instances إضافية

---

## ⚠️ استكشاف الأخطاء:

### **التطبيق لا يعمل:**
1. تحقق من **Logs** في Azure Portal
2. تأكد من صحة `DATABASE_URL`
3. تأكد من `PORT=8080` أو `process.env.PORT`
4. تحقق من `NODE_ENV=production`

### **Database Connection Error:**
1. تحقق من Connection String في Neon
2. تأكد من إضافة IP Azure إلى Allowlist في Neon (إن وجد)
3. اختبر الاتصال من Kudu Console

### **Application Error 500:**
1. افتح **Log Stream** في Azure Portal
2. ابحث عن رسالة الخطأ
3. تحقق من المتغيرات البيئية

---

## 📞 الدعم:

- **Azure Docs**: https://docs.microsoft.com/azure/app-service/
- **Azure Support**: من Azure Portal → Support
- **Neon Docs**: https://neon.tech/docs

---

## 🎉 تهانينا!

تطبيقك الآن على **Azure** - منصة enterprise-grade احترافية!

**المزايا:**
✅ موثوقية 99.95%
✅ أمان على مستوى المؤسسات
✅ دعم فني 24/7
✅ Scaling سهل
✅ تكامل مع خدمات Azure الأخرى
