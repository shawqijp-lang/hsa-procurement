# 📦 الملفات المطلوبة للنشر على Render

## ✅ الملفات الأساسية فقط:

### 1. **ملفات التكوين:**
- `package.json` ← npm dependencies
- `tsconfig.json` ← TypeScript config
- `vite.config.ts` ← Vite config
- `tailwind.config.ts` ← Tailwind config
- `postcss.config.js` ← PostCSS config
- `drizzle.config.ts` ← Database config
- `render.yaml` ← Render deployment config

### 2. **مجلد Server:**
- `server/` ← كل الملفات فيه
  - `server/index.ts`
  - `server/db.ts`
  - `server/routes.ts`
  - `server/storage.ts`
  - `server/vite.ts`

### 3. **مجلد Shared:**
- `shared/` ← كل الملفات فيه
  - `shared/schema.ts`

### 4. **مجلد Client:**
- `client/` ← كل المجلد
  - `client/src/`
  - `client/index.html`

### 5. **مجلد Public:**
- `public/` ← الأيقونات و manifest

---

## ❌ الملفات غير المطلوبة (لا ترفعها):

- ❌ `node_modules/` ← سيتم تثبيتها تلقائياً
- ❌ `dist/` ← سيتم بناؤها تلقائياً
- ❌ `.git/` ← Git metadata
- ❌ `.cache/` ← Cache files
- ❌ `*.log` ← Log files
- ❌ `.replit` ← Replit config
- ❌ `replit.nix` ← Replit Nix config
- ❌ `production_export.dump` ← Database dump (ضخم)
- ❌ `migration-scripts/` ← غير ضروري للنشر

---

## 🚀 الطريقة السريعة:

### الخيار الأفضل: نسخ الملفات يدوياً

**من Replit إلى GitHub مباشرة:**

1. افتح ملف في Replit
2. انسخ محتواه (Ctrl+A, Ctrl+C)
3. في GitHub repository → Add file → Create new file
4. الصق المحتوى
5. اكتب اسم الملف بالمسار الكامل (مثلاً: `server/index.ts`)
6. Commit changes

كرر لكل ملف من القائمة أعلاه.

---

## 💡 أو: استخدم GitHub Desktop

1. حمّل GitHub Desktop
2. Clone repository
3. انسخ الملفات من Replit إلى المجلد المحلي
4. Commit & Push

---

## ⏱️ الوقت المتوقع:

- نسخ يدوي: **15-20 دقيقة**
- GitHub Desktop: **5 دقائق**
