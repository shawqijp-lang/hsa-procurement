#!/bin/bash

echo "🚀 نقل قاعدة البيانات مباشرة إلى Neon..."
echo ""

# Neon connection string
NEON_URL="$1"

if [ -z "$NEON_URL" ]; then
  echo "❌ يرجى تقديم Neon connection string"
  echo "الاستخدام: bash direct-copy-to-neon.sh 'postgresql://...'"
  exit 1
fi

echo "📦 استيراد البيانات من production_export.dump..."
echo ""

# استخدام pg_restore مع معاملات محسّنة
pg_restore \
  --verbose \
  --no-acl \
  --no-owner \
  --clean \
  --if-exists \
  --dbname="$NEON_URL" \
  production_export.dump 2>&1 | tee restore.log

echo ""
echo "✅ انتهت عملية الاستيراد"
echo "📋 تحقق من الملف restore.log للتفاصيل"
