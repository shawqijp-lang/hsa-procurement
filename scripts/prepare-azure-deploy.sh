#!/bin/bash

echo "🚀 تحضير التطبيق للنشر على Azure..."
echo ""

# بناء التطبيق
echo "📦 الخطوة 1: بناء التطبيق..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ فشل البناء!"
  exit 1
fi

echo "✅ تم البناء بنجاح"
echo ""

# إنشاء مجلد النشر
echo "📁 الخطوة 2: إنشاء مجلد النشر..."
rm -rf deploy-package
mkdir -p deploy-package

# نسخ الملفات المطلوبة
echo "📋 الخطوة 3: نسخ الملفات..."
cp -r dist deploy-package/
cp -r node_modules deploy-package/
cp package.json deploy-package/
cp web.config deploy-package/
cp .deployment deploy-package/

# إنشاء package.json للإنتاج فقط
cat > deploy-package/package.json << 'EOF'
{
  "name": "hsa-procurement-system",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node dist/index.js"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
EOF

echo "✅ تم نسخ الملفات"
echo ""

# إنشاء ملف zip
echo "🗜️  الخطوة 4: إنشاء ملف ZIP..."
cd deploy-package
zip -r ../azure-deploy.zip . -q

if [ $? -ne 0 ]; then
  echo "❌ فشل إنشاء ملف ZIP!"
  exit 1
fi

cd ..
echo "✅ تم إنشاء azure-deploy.zip"
echo ""

# عرض معلومات الملف
FILE_SIZE=$(ls -lh azure-deploy.zip | awk '{print $5}')
echo "📊 معلومات الملف:"
echo "   الاسم: azure-deploy.zip"
echo "   الحجم: $FILE_SIZE"
echo ""

echo "🎉 جاهز للنشر!"
echo ""
echo "📝 الخطوات التالية:"
echo "   1. اذهب إلى: https://portal.azure.com"
echo "   2. أنشئ App Service (Node.js 20)"
echo "   3. افتح Kudu: https://YOUR-APP.scm.azurewebsites.net"
echo "   4. اذهب إلى: Tools → Zip Push Deploy"
echo "   5. اسحب ملف azure-deploy.zip وأفلته"
echo "   6. أضف المتغيرات البيئية في Configuration"
echo ""
