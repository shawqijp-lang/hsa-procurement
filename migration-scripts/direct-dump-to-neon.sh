#!/bin/bash

echo "🚀 نقل مباشر من Production إلى Neon..."
echo ""

SOURCE_URL="$DATABASE_URL_PROD"
TARGET_URL="$1"

if [ -z "$TARGET_URL" ]; then
  echo "❌ يرجى تقديم Neon connection string"
  exit 1
fi

echo "📦 الخطوة 1: تصدير من Production..."
pg_dump "$SOURCE_URL" \
  --schema=production \
  --no-owner \
  --no-acl \
  --format=plain \
  --file=production_clean.sql

echo "✅ تم التصدير"
echo ""
echo "📥 الخطوة 2: استيراد إلى Neon..."

psql "$TARGET_URL" < production_clean.sql 2>&1 | head -50

echo ""
echo "✅ تم الانتهاء!"
