# 🚀 أدوات نقل قاعدة البيانات إلى Azure PostgreSQL

## 📁 محتويات المجلد

| الملف | الوصف |
|------|-------|
| `AZURE_MIGRATION_GUIDE.md` | دليل شامل كامل لكل خطوات النقل |
| `export-production-to-azure.sh` | سكريبت تصدير البيانات من Replit |
| `import-to-azure.sh` | سكريبت استيراد البيانات إلى Azure |
| `test-azure-connection.sh` | سكريبت اختبار الاتصال بـ Azure |
| `.env.azure.example` | ملف إعدادات نموذجي للإنتاج |

---

## ⚡ البدء السريع (3 خطوات)

### 1️⃣ تصدير البيانات من Replit

```bash
chmod +x export-production-to-azure.sh
./export-production-to-azure.sh
```

سيُنشئ ملفات في `azure-migration-backup/`:
- `production_export_*.dump` (للاستيراد)
- `production_export_*.sql` (للقراءة)

### 2️⃣ إنشاء Azure PostgreSQL

اتبع الدليل الشامل: [`AZURE_MIGRATION_GUIDE.md`](./AZURE_MIGRATION_GUIDE.md)

أو باختصار:
1. افتح [portal.azure.com](https://portal.azure.com)
2. أنشئ **Azure Database for PostgreSQL Flexible Server**
3. الإعدادات:
   - Server: `hsa-production-db`
   - Version: PostgreSQL 14/15
   - Compute: B1ms (1 vCore, 2GB)
   - Region: اختر الأقرب

### 3️⃣ استيراد البيانات

```bash
export AZURE_PASSWORD="كلمة-سر-azure"
chmod +x import-to-azure.sh
./import-to-azure.sh azure-migration-backup/production_export_*.dump
```

---

## ✅ اختبار الاتصال

```bash
chmod +x test-azure-connection.sh
./test-azure-connection.sh
```

سيتحقق من:
- ✅ الاتصال الأساسي
- ✅ SSL
- ✅ production schema
- ✅ الجداول والبيانات

---

## 🔗 ربط التطبيق

### 1. انسخ ملف الإعدادات

```bash
cp .env.azure.example .env
```

### 2. عدّل القيم

```bash
nano .env
```

أضف:
```env
DATABASE_URL_PROD=postgresql://hsaadmin:كلمة-السر@hsa-production-db.postgres.database.azure.com:5432/hsa_production?sslmode=require&options=-c%20search_path=production

JWT_SECRET=مفتاح-عشوائي-قوي-جداً
NODE_ENV=production
```

### 3. أعد تشغيل التطبيق

```bash
npm run build
npm start

# أو مع PM2
pm2 restart hsa-production
```

---

## 📊 التكلفة

| الخطة | المواصفات | السعر/شهر |
|-------|-----------|----------|
| **B1ms** | 1 vCore, 2GB RAM, 32GB | ~$12 |
| **B2s** | 2 vCore, 4GB RAM, 32GB | ~$25 |

---

## 🔒 الأمان

### إعدادات Azure الموصى بها:

1. **Firewall Rules**: IPs محددة فقط
2. **SSL**: إجباري (sslmode=require)
3. **Backup**: 7 أيام على الأقل
4. **كلمة السر**: 16+ حرف، أحرف ورموز

---

## ❓ استكشاف الأخطاء

### مشكلة: فشل الاتصال

```
✅ الحل:
1. تحقق من Firewall Rules في Azure
2. أضف IP الخادم
3. تأكد من sslmode=require
```

### مشكلة: Permission Denied

```sql
-- منح الصلاحيات
GRANT ALL ON SCHEMA production TO hsaadmin;
GRANT ALL ON ALL TABLES IN SCHEMA production TO hsaadmin;
```

### مشكلة: البيانات غير ظاهرة

```sql
-- تعيين search_path
SET search_path TO production;
\dt
```

---

## 📚 الدليل الكامل

للحصول على دليل مفصل خطوة بخطوة مع صور وشروحات:

👉 [`AZURE_MIGRATION_GUIDE.md`](./AZURE_MIGRATION_GUIDE.md)

---

## ✅ قائمة التحقق

- [ ] تم تصدير البيانات من Replit
- [ ] تم إنشاء Azure PostgreSQL Server
- [ ] تم إنشاء production schema
- [ ] تم استيراد البيانات بنجاح
- [ ] تم اختبار الاتصال
- [ ] تم تحديث .env على خادم الإنتاج
- [ ] تم إعادة تشغيل التطبيق
- [ ] تم اختبار التطبيق بالكامل
- [ ] تم إعداد Firewall Rules
- [ ] تم إعداد النسخ الاحتياطي

---

## 🎯 النتيجة

✅ **استقلالية كاملة** عن Replit  
✅ **خصوصية تامة** - بياناتك على Azure فقط  
✅ **أمان محسّن** - SSL + Firewall + Microsoft Security  
✅ **نسخ احتياطي تلقائي** - حماية البيانات  

**تم بنجاح! 🎉**
