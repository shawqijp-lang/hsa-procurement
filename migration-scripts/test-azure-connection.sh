#!/bin/bash

# ==========================================
# سكريبت اختبار الاتصال بـ Azure PostgreSQL
# ==========================================

echo "🔍 اختبار الاتصال بـ Azure PostgreSQL..."
echo "========================================"

# ==========================================
# المتغيرات - عدّلها حسب إعدادات Azure
# ==========================================

AZURE_HOST="${AZURE_HOST:-hsa-production-db.postgres.database.azure.com}"
AZURE_USER="${AZURE_USER:-hsaadmin}"
AZURE_DB="${AZURE_DB:-hsa_production}"
AZURE_PORT="${AZURE_PORT:-5432}"

# ==========================================
# التحقق من المتطلبات
# ==========================================

# التحقق من psql
if ! command -v psql &> /dev/null; then
    echo "❌ خطأ: psql غير مثبت"
    echo "ثبّته باستخدام: apt install postgresql-client"
    exit 1
fi

# التحقق من كلمة السر
if [ -z "$AZURE_PASSWORD" ]; then
    echo "⚠️  كلمة سر Azure غير محددة"
    read -sp "أدخل كلمة سر Azure PostgreSQL: " AZURE_PASSWORD
    echo ""
fi

# ==========================================
# اختبار 1: الاتصال الأساسي
# ==========================================

echo ""
echo "📡 اختبار 1: الاتصال الأساسي..."

PGPASSWORD=$AZURE_PASSWORD psql \
  -h $AZURE_HOST \
  -U $AZURE_USER \
  -d $AZURE_DB \
  -p $AZURE_PORT \
  -c "SELECT version();" \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ نجح الاتصال الأساسي"
else
    echo "❌ فشل الاتصال الأساسي"
    echo "تحقق من:"
    echo "  - اسم الخادم: $AZURE_HOST"
    echo "  - اسم المستخدم: $AZURE_USER"
    echo "  - كلمة السر"
    echo "  - Firewall Rules في Azure"
    exit 1
fi

# ==========================================
# اختبار 2: التحقق من SSL
# ==========================================

echo ""
echo "🔒 اختبار 2: التحقق من SSL..."

PGPASSWORD=$AZURE_PASSWORD psql \
  -h $AZURE_HOST \
  -U $AZURE_USER \
  -d $AZURE_DB \
  -p $AZURE_PORT \
  -c "SHOW ssl;" 2>&1 | grep -q "on"

if [ $? -eq 0 ]; then
    echo "✅ SSL مفعّل"
else
    echo "⚠️  SSL قد لا يكون مفعّلاً"
fi

# ==========================================
# اختبار 3: التحقق من production schema
# ==========================================

echo ""
echo "📁 اختبار 3: التحقق من production schema..."

SCHEMA_EXISTS=$(PGPASSWORD=$AZURE_PASSWORD psql \
  -h $AZURE_HOST \
  -U $AZURE_USER \
  -d $AZURE_DB \
  -p $AZURE_PORT \
  -t -c "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'production';" 2>/dev/null)

if [ -n "$SCHEMA_EXISTS" ]; then
    echo "✅ production schema موجود"
else
    echo "⚠️  production schema غير موجود"
    echo "أنشئه باستخدام:"
    echo "  CREATE SCHEMA production;"
fi

# ==========================================
# اختبار 4: عرض معلومات الخادم
# ==========================================

echo ""
echo "📊 معلومات الخادم:"
echo "========================================"

PGPASSWORD=$AZURE_PASSWORD psql \
  -h $AZURE_HOST \
  -U $AZURE_USER \
  -d $AZURE_DB \
  -p $AZURE_PORT \
  -c "SELECT 
    version() as postgresql_version,
    current_database() as database_name,
    current_user as username,
    inet_server_addr() as server_ip,
    inet_server_port() as server_port;"

# ==========================================
# اختبار 5: عرض الجداول في production schema
# ==========================================

if [ -n "$SCHEMA_EXISTS" ]; then
    echo ""
    echo "📋 الجداول في production schema:"
    echo "========================================"
    
    # عرض الجداول
    PGPASSWORD=$AZURE_PASSWORD psql \
      -h $AZURE_HOST \
      -U $AZURE_USER \
      -d $AZURE_DB \
      -p $AZURE_PORT \
      -c "\dt production.*"
    
    # عرض عدد السجلات للجداول الرئيسية
    echo ""
    echo "📊 عدد السجلات:"
    PGPASSWORD=$AZURE_PASSWORD psql \
      -h $AZURE_HOST \
      -U $AZURE_USER \
      -d $AZURE_DB \
      -p $AZURE_PORT \
      -c "SET search_path TO production;
          SELECT 'users' as table_name, COUNT(*) as count FROM users
          UNION ALL
          SELECT 'companies', COUNT(*) FROM companies
          UNION ALL
          SELECT 'locations', COUNT(*) FROM locations
          UNION ALL
          SELECT 'daily_checklists', COUNT(*) FROM daily_checklists;" 2>/dev/null || \
          echo "⚠️  لا توجد بيانات بعد"
fi

# ==========================================
# اختبار 6: اختبار Connection String
# ==========================================

echo ""
echo "🔗 اختبار 6: Connection String للتطبيق..."

CONNECTION_STRING="postgresql://$AZURE_USER:***@$AZURE_HOST:$AZURE_PORT/$AZURE_DB?sslmode=require&options=-c%20search_path=production"
echo "Connection String (بدون كلمة السر):"
echo "$CONNECTION_STRING"

echo ""
echo "Connection String الكامل (للنسخ إلى .env):"
echo "DATABASE_URL_PROD=postgresql://$AZURE_USER:كلمة-السر@$AZURE_HOST:$AZURE_PORT/$AZURE_DB?sslmode=require&options=-c%20search_path=production"

# ==========================================
# النتيجة النهائية
# ==========================================

echo ""
echo "========================================"
echo "✅ اكتملت كل الاختبارات!"
echo ""
echo "📌 الخطوات التالية:"
echo "1. انسخ Connection String أعلاه"
echo "2. أضفه إلى ملف .env على خادم الإنتاج"
echo "3. أعد تشغيل التطبيق"
echo "========================================"
