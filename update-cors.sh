#!/bin/bash

echo "🔄 Updating CORS fix to GitHub..."

if [ -z "$GIT_TOKEN" ]; then
    echo "❌ GIT_TOKEN not found"
    exit 1
fi

git add server/index.ts
git commit -m "Fix: Add Render.com to CORS allowed origins"
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ CORS fix pushed!"
    echo "🔄 Render will redeploy automatically"
else
    echo "❌ Failed"
    exit 1
fi
