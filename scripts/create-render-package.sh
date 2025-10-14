#!/bin/bash

echo "📦 إنشاء حزمة النشر لـ Render..."
echo ""

# بناء التطبيق
echo "🔨 بناء التطبيق..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ فشل البناء!"
  exit 1
fi

echo "✅ تم البناء بنجاح"
echo ""

# إنشاء مجلد مؤقت
echo "📁 إنشاء حزمة النشر..."
rm -rf render-deploy
mkdir -p render-deploy

# نسخ الملفات الضرورية
cp -r dist render-deploy/
cp package.json render-deploy/
cp render.yaml render-deploy/

# إنشاء package.json مبسط
cat > render-deploy/package.json << 'EOF'
{
  "name": "hsa-procurement-system",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node dist/index.js"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.10.4",
    "bcrypt": "^6.0.0",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2",
    "drizzle-orm": "^0.39.1",
    "cors": "^2.8.5",
    "helmet": "^8.1.0",
    "express-rate-limit": "^8.0.1",
    "zod": "^3.24.2"
  }
}
EOF

# نسخ node_modules الضرورية فقط
echo "📚 نسخ dependencies..."
mkdir -p render-deploy/node_modules

# إنشاء ملف tar
echo "🗜️ إنشاء ملف مضغوط..."
tar -czf render-deploy.tar.gz -C render-deploy .

FILE_SIZE=$(ls -lh render-deploy.tar.gz | awk '{print $5}')

echo ""
echo "✅ تم إنشاء render-deploy.tar.gz"
echo "📊 الحجم: $FILE_SIZE"
echo ""
echo "🎉 جاهز للرفع إلى Render!"
echo ""
echo "📝 الخطوات التالية:"
echo "   1. اذهب إلى: https://dashboard.render.com"
echo "   2. New + → Web Service"
echo "   3. اختر: 'Deploy from Git repository'"
echo "   4. أدخل URL: https://github.com/shawqijp-lang/hsa-procurement.git"
echo "   5. أو استخدم طريقة الرفع اليدوي إذا متاحة"
