# 🚀 دليل نقل قاعدة بيانات الإنتاج إلى Azure PostgreSQL

## 📋 نظرة عامة

هذا الدليل يوضح خطوات نقل قاعدة بيانات الإنتاج من Replit/Neon إلى Azure PostgreSQL لضمان **الاستقلالية الكاملة** والخصوصية.

---

## ✅ المتطلبات الأساسية

- [ ] حساب Microsoft Azure نشط
- [ ] بطاقة ائتمان للفوترة (أو رصيد Azure)
- [ ] صلاحيات إنشاء موارد في Azure
- [ ] معرفة أساسية بـ PostgreSQL

---

## 🏗️ المرحلة 1: إنشاء Azure PostgreSQL Server

### الخطوة 1: الدخول إلى Azure Portal

1. افتح [portal.azure.com](https://portal.azure.com)
2. سجّل الدخول بحساب Microsoft الخاص بك

### الخطوة 2: إنشاء PostgreSQL Server

1. في شريط البحث، اكتب: **"Azure Database for PostgreSQL"**
2. اختر **"Azure Database for PostgreSQL Flexible Server"**
3. انقر **"Create"**

### الخطوة 3: الإعدادات الأساسية

```
📍 Subscription: اختر اشتراكك
📍 Resource Group: أنشئ جديد → "HSA-Production-RG"
📍 Server name: hsa-production-db
📍 Region: West Europe (أو الأقرب لموقعك)
📍 PostgreSQL version: 14 أو 15
📍 Workload type: Development (للبداية)
📍 Compute + Storage: Burstable, B1ms
   - vCores: 1
   - Memory: 2 GB
   - Storage: 32 GB
```

### الخطوة 4: إعدادات المصادقة

```
👤 Admin username: hsaadmin
🔐 Password: [كلمة سر قوية - احفظها!]
   - 12+ حرف
   - أحرف كبيرة وصغيرة
   - أرقام ورموز خاصة
```

### الخطوة 5: إعدادات الشبكة (Networking)

```
🌐 Connectivity method: Public access (0.0.0.0/0)
✅ Allow public access from any Azure service

⚠️ مهم: بعد الإنشاء، سنحد الوصول لـ IPs محددة
```

### الخطوة 6: النسخ الاحتياطي (Backup)

```
📦 Backup retention: 7 days (يمكن زيادتها لاحقاً)
✅ Geo-redundant backup: Disabled (لتوفير التكلفة)
```

### الخطوة 7: المراجعة والإنشاء

1. راجع كل الإعدادات
2. انقر **"Create"**
3. انتظر 5-10 دقائق للإنشاء

---

## 🔐 المرحلة 2: إعداد الأمان

### الخطوة 1: تقييد الوصول بـ Firewall

1. افتح PostgreSQL Server الذي أنشأته
2. اذهب إلى **Networking**
3. في **Firewall Rules**:
   - احذف القاعدة `0.0.0.0/0`
   - أضف IP خادمك: `[IP-خادم-الإنتاج]`
   - أضف IP جهازك للإدارة: `[IP-جهازك]`

### الخطوة 2: تفعيل SSL (مفعّل افتراضياً)

- تأكد من **"Require SSL"** مفعّل
- جميع الاتصالات يجب أن تكون: `sslmode=require`

---

## 📥 المرحلة 3: تصدير البيانات من Replit

### الطريقة 1: استخدام السكريبت الجاهز (موصى به)

```bash
# من Replit Console
chmod +x migration-scripts/export-production-to-azure.sh
./migration-scripts/export-production-to-azure.sh
```

سيُنشئ السكريبت:
- `production_export_YYYYMMDD_HHMMSS.dump` (Custom Format)
- `production_export_YYYYMMDD_HHMMSS.sql` (SQL Format)

### الطريقة 2: يدوياً

```bash
# Custom Format (موصى به)
pg_dump $DATABASE_URL_PROD \
  --schema=production \
  --no-owner \
  --no-privileges \
  --format=custom \
  --file=production.dump

# SQL Format (للقراءة)
pg_dump $DATABASE_URL_PROD \
  --schema=production \
  --no-owner \
  --no-privileges \
  > production.sql
```

### تحميل الملفات

1. من Replit Files، انقر بالزر الأيمن على الملف
2. اختر **Download**
3. احفظ الملف على جهازك

---

## 🗄️ المرحلة 4: إنشاء قاعدة البيانات والـ Schema

### من Azure Portal (Cloud Shell)

```bash
# افتح Cloud Shell (أيقونة >_ في الأعلى)
# اختر Bash

# الاتصال بالخادم
psql "host=hsa-production-db.postgres.database.azure.com \
      port=5432 \
      dbname=postgres \
      user=hsaadmin \
      sslmode=require"

# أدخل كلمة السر عند الطلب
```

### إنشاء القاعدة والـ Schema

```sql
-- إنشاء قاعدة البيانات
CREATE DATABASE hsa_production;

-- الاتصال بالقاعدة الجديدة
\c hsa_production

-- إنشاء production schema
CREATE SCHEMA production;

-- منح الصلاحيات
GRANT ALL ON SCHEMA production TO hsaadmin;
GRANT ALL ON ALL TABLES IN SCHEMA production TO hsaadmin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA production TO hsaadmin;

-- التحقق
\dn
```

---

## 📤 المرحلة 5: استيراد البيانات إلى Azure

### الطريقة 1: استخدام السكريبت الجاهز

```bash
# من جهازك المحلي
export AZURE_PASSWORD="كلمة-السر-القوية"
chmod +x migration-scripts/import-to-azure.sh
./migration-scripts/import-to-azure.sh azure-migration-backup/production_export_*.dump
```

### الطريقة 2: يدوياً

#### إذا كان الملف Custom Format (.dump):

```bash
pg_restore \
  -h hsa-production-db.postgres.database.azure.com \
  -U hsaadmin \
  -d hsa_production \
  -p 5432 \
  --no-owner \
  --no-privileges \
  production.dump
```

#### إذا كان الملف SQL (.sql):

```bash
psql \
  -h hsa-production-db.postgres.database.azure.com \
  -U hsaadmin \
  -d hsa_production \
  -p 5432 \
  -f production.sql
```

---

## ✅ المرحلة 6: التحقق من البيانات

```sql
-- الاتصال بقاعدة البيانات
psql "host=hsa-production-db.postgres.database.azure.com \
      user=hsaadmin \
      dbname=hsa_production \
      sslmode=require"

-- تعيين search_path
SET search_path TO production;

-- عرض الجداول
\dt

-- التحقق من عدد السجلات
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'daily_checklists', COUNT(*) FROM daily_checklists;

-- التحقق من أحدث تقييم
SELECT * FROM daily_checklists 
ORDER BY id DESC 
LIMIT 1;
```

---

## 🔗 المرحلة 7: ربط التطبيق بـ Azure

### الخطوة 1: إنشاء Connection String

```
postgresql://hsaadmin:كلمة-السر@hsa-production-db.postgres.database.azure.com:5432/hsa_production?sslmode=require&options=-c%20search_path=production
```

### الخطوة 2: تحديث خادم الإنتاج

```bash
# على خادم الإنتاج (ليس Replit)
# انسخ .env.azure.example إلى .env
cp migration-scripts/.env.azure.example .env

# عدّل الملف:
nano .env

# أضف القيم الصحيحة:
DATABASE_URL_PROD=postgresql://hsaadmin:...@hsa-production-db.postgres.database.azure.com:5432/hsa_production?sslmode=require&options=-c%20search_path=production
JWT_SECRET=مفتاح-عشوائي-قوي-جداً
NODE_ENV=production
```

### الخطوة 3: إعادة تشغيل التطبيق

```bash
# إيقاف التطبيق الحالي
pm2 stop hsa-production

# تحديث الاعتماديات (إذا لزم)
npm install

# بناء التطبيق
npm run build

# تشغيل مع الإعدادات الجديدة
pm2 start npm --name hsa-production -- start

# حفظ التكوين
pm2 save
```

---

## 🧪 المرحلة 8: الاختبار والتحقق

### اختبار الاتصال

```bash
# من خادم الإنتاج
node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL_PROD);
sql\`SELECT version()\`.then(console.log);
"
```

### اختبار التطبيق

1. افتح التطبيق في المتصفح
2. سجّل دخول
3. تحقق من:
   - عرض الشركات
   - عرض المواقع
   - التقييمات اليومية
   - التقارير

---

## 🗑️ المرحلة 9: تنظيف Replit (اختياري)

⚠️ **فقط بعد التأكد من نجاح النقل بالكامل!**

```sql
-- من Replit Console
psql $DATABASE_URL_PROD

-- حذف production schema
DROP SCHEMA production CASCADE;

-- أو حذف البيانات فقط
TRUNCATE TABLE production.daily_checklists CASCADE;
TRUNCATE TABLE production.users CASCADE;
-- ... إلخ
```

---

## 💰 التكلفة المتوقعة

| المواصفات | السعر/شهر (تقريبي) |
|-----------|-------------------|
| **B1ms** (1 vCore, 2GB) | $12-15 |
| **B2s** (2 vCore, 4GB) | $25-30 |
| Storage 32GB | مضمّن |
| Backup 7 days | مضمّن |

💡 **نصيحة:** ابدأ بـ B1ms، ثم قم بالترقية حسب الحاجة

---

## 🔄 النسخ الاحتياطي التلقائي

### النسخ الاحتياطي المُدمج في Azure

- ✅ نسخ تلقائي يومي (7-35 يوم)
- ✅ Point-in-time restore
- ✅ لا حاجة لإعداد إضافي

### نسخ احتياطي إضافي (موصى به)

```bash
# Cron job على خادمك (يومياً الساعة 2 صباحاً)
0 2 * * * pg_dump \
  -h hsa-production-db.postgres.database.azure.com \
  -U hsaadmin \
  -d hsa_production \
  > /backup/azure_db_$(date +\%Y\%m\%d).sql
```

---

## 📊 المراقبة والأداء

### في Azure Portal

1. افتح PostgreSQL Server
2. اذهب إلى **Monitoring** → **Metrics**
3. راقب:
   - CPU Percent
   - Memory Percent
   - Storage Percent
   - Active Connections

### تنبيهات (Alerts)

1. اذهب إلى **Alerts** → **Create Alert Rule**
2. أضف تنبيهات:
   - CPU > 80%
   - Storage > 80%
   - Failed Connections

---

## ❓ استكشاف الأخطاء

### خطأ: SSL Connection Required

```
الحل: أضف sslmode=require في connection string
```

### خطأ: No pg_hba.conf entry

```
الحل: تحقق من Firewall Rules في Azure
أضف IP الخادم الذي يحاول الاتصال
```

### خطأ: Permission Denied for Schema

```sql
-- منح صلاحيات للـ schema
GRANT ALL ON SCHEMA production TO hsaadmin;
GRANT ALL ON ALL TABLES IN SCHEMA production TO hsaadmin;
```

---

## ✅ قائمة التحقق النهائية

- [ ] تم إنشاء Azure PostgreSQL بنجاح
- [ ] تم تصدير البيانات من Replit
- [ ] تم استيراد البيانات إلى Azure
- [ ] تم التحقق من عدد السجلات
- [ ] تم تحديث DATABASE_URL_PROD
- [ ] تم اختبار التطبيق بالكامل
- [ ] تم إعداد النسخ الاحتياطي
- [ ] تم إعداد المراقبة والتنبيهات
- [ ] تم تقييد Firewall (IPs محددة فقط)
- [ ] تم حذف ملفات التصدير المؤقتة

---

## 🎯 النتيجة النهائية

✅ **استقلالية كاملة** - بيانات الإنتاج على Azure (خارج Replit)  
✅ **خصوصية تامة** - لا يمكن لـ Replit الوصول للبيانات  
✅ **أمان محسّن** - SSL + Firewall + Microsoft Security  
✅ **نسخ احتياطي تلقائي** - حماية البيانات  
✅ **قابلية التوسع** - ترقية سهلة حسب الحاجة  

---

## 📞 الدعم

إذا واجهت أي مشكلة:
1. راجع قسم استكشاف الأخطاء
2. تحقق من Azure Portal → Activity Log
3. راجع PostgreSQL Logs في Azure

**تم بنجاح! 🎉**
