#!/bin/bash

# ==========================================
# سكريبت استيراد البيانات إلى Azure PostgreSQL
# ==========================================

echo "🔄 بدء استيراد البيانات إلى Azure PostgreSQL..."
echo "========================================"

# ==========================================
# المتغيرات - عدّلها حسب إعدادات Azure الخاصة بك
# ==========================================

# بيانات اتصال Azure PostgreSQL
AZURE_HOST="hsa-production-db.postgres.database.azure.com"
AZURE_USER="hsaadmin"
AZURE_DB="hsa_production"
AZURE_PORT="5432"

# مسار ملف النسخة الاحتياطية
BACKUP_FILE="${1:-azure-migration-backup/production_export_*.dump}"

# ==========================================
# التحقق من المتطلبات
# ==========================================

# التحقق من وجود ملف النسخة الاحتياطية
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ خطأ: ملف النسخة الاحتياطية غير موجود: $BACKUP_FILE"
    echo "الاستخدام: $0 [مسار_ملف_النسخة_الاحتياطية]"
    exit 1
fi

# التحقق من كلمة سر Azure
if [ -z "$AZURE_PASSWORD" ]; then
    echo "⚠️  كلمة سر Azure غير محددة في AZURE_PASSWORD"
    read -sp "أدخل كلمة سر Azure PostgreSQL: " AZURE_PASSWORD
    echo ""
fi

# ==========================================
# إنشاء Production Schema
# ==========================================

echo ""
echo "📁 إنشاء production schema في Azure..."

PGPASSWORD=$AZURE_PASSWORD psql \
  -h $AZURE_HOST \
  -U $AZURE_USER \
  -d $AZURE_DB \
  -p $AZURE_PORT \
  -c "CREATE SCHEMA IF NOT EXISTS production;"

if [ $? -eq 0 ]; then
    echo "✅ تم إنشاء production schema بنجاح"
else
    echo "❌ فشل إنشاء production schema"
    exit 1
fi

# ==========================================
# استيراد البيانات
# ==========================================

echo ""
echo "📥 جاري استيراد البيانات..."
echo "الملف: $BACKUP_FILE"
echo ""

# التحقق من نوع الملف
if [[ "$BACKUP_FILE" == *.dump ]]; then
    # استيراد Custom Format
    echo "📦 استيراد Custom Format..."
    PGPASSWORD=$AZURE_PASSWORD pg_restore \
      -h $AZURE_HOST \
      -U $AZURE_USER \
      -d $AZURE_DB \
      -p $AZURE_PORT \
      --no-owner \
      --no-privileges \
      --verbose \
      "$BACKUP_FILE"
elif [[ "$BACKUP_FILE" == *.sql ]]; then
    # استيراد SQL Format
    echo "📝 استيراد SQL Format..."
    PGPASSWORD=$AZURE_PASSWORD psql \
      -h $AZURE_HOST \
      -U $AZURE_USER \
      -d $AZURE_DB \
      -p $AZURE_PORT \
      -f "$BACKUP_FILE"
else
    echo "❌ نوع ملف غير مدعوم: $BACKUP_FILE"
    exit 1
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ اكتمل الاستيراد بنجاح!"
else
    echo ""
    echo "❌ فشل الاستيراد - راجع الأخطاء أعلاه"
    exit 1
fi

# ==========================================
# التحقق من البيانات
# ==========================================

echo ""
echo "🔍 التحقق من البيانات المستوردة..."
echo "========================================"

PGPASSWORD=$AZURE_PASSWORD psql \
  -h $AZURE_HOST \
  -U $AZURE_USER \
  -d $AZURE_DB \
  -p $AZURE_PORT \
  -c "SET search_path TO production; 
      SELECT 
        'users' as table_name, COUNT(*) as count FROM users
      UNION ALL
      SELECT 
        'companies', COUNT(*) FROM companies
      UNION ALL
      SELECT 
        'locations', COUNT(*) FROM locations
      UNION ALL
      SELECT 
        'daily_checklists', COUNT(*) FROM daily_checklists;"

echo ""
echo "✅ اكتمل النقل بنجاح!"
echo ""
echo "📌 الخطوات التالية:"
echo "1. حدّث متغير DATABASE_URL_PROD في خادم الإنتاج"
echo "2. أعد تشغيل التطبيق"
echo "3. احذف البيانات من Replit (اختياري)"
echo "========================================"
