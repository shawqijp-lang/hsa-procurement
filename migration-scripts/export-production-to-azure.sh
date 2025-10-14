#!/bin/bash

# ==========================================
# سكريبت تصدير قاعدة بيانات الإنتاج
# للنقل إلى Azure PostgreSQL
# ==========================================

echo "🔄 بدء تصدير قاعدة بيانات الإنتاج..."
echo "========================================"

# التحقق من وجود DATABASE_URL_PROD
if [ -z "$DATABASE_URL_PROD" ]; then
    echo "❌ خطأ: DATABASE_URL_PROD غير موجود في البيئة"
    echo "يرجى تعيين متغير البيئة DATABASE_URL_PROD"
    exit 1
fi

# إنشاء مجلد النسخ الاحتياطية
BACKUP_DIR="azure-migration-backup"
mkdir -p $BACKUP_DIR

# اسم الملف بالتاريخ والوقت
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/production_export_$TIMESTAMP"

echo "📁 مجلد النسخ الاحتياطي: $BACKUP_DIR"
echo "📝 اسم الملف: $BACKUP_FILE"
echo ""

# ==========================================
# الخيار 1: تصدير Custom Format (موصى به)
# ==========================================
echo "📦 جاري التصدير بصيغة Custom Format..."
pg_dump "$DATABASE_URL_PROD" \
  --schema=production \
  --no-owner \
  --no-privileges \
  --format=custom \
  --file="${BACKUP_FILE}.dump"

if [ $? -eq 0 ]; then
    echo "✅ نجح التصدير Custom Format: ${BACKUP_FILE}.dump"
else
    echo "❌ فشل التصدير Custom Format"
    exit 1
fi

# ==========================================
# الخيار 2: تصدير SQL Format (للقراءة)
# ==========================================
echo ""
echo "📝 جاري التصدير بصيغة SQL..."
pg_dump "$DATABASE_URL_PROD" \
  --schema=production \
  --no-owner \
  --no-privileges \
  > "${BACKUP_FILE}.sql"

if [ $? -eq 0 ]; then
    echo "✅ نجح التصدير SQL Format: ${BACKUP_FILE}.sql"
else
    echo "❌ فشل التصدير SQL Format"
    exit 1
fi

# ==========================================
# إحصائيات الملفات
# ==========================================
echo ""
echo "📊 إحصائيات الملفات المُصدّرة:"
echo "========================================"
ls -lh ${BACKUP_FILE}.*

# ==========================================
# معلومات مهمة
# ==========================================
echo ""
echo "✅ اكتمل التصدير بنجاح!"
echo ""
echo "📌 الخطوات التالية:"
echo "1. حمّل الملفات من: $BACKUP_DIR"
echo "2. أنشئ Azure PostgreSQL Server"
echo "3. استورد البيانات باستخدام:"
echo "   pg_restore أو psql"
echo ""
echo "🔐 ملاحظة أمنية: احذف الملفات بعد النقل الناجح"
echo "========================================"
