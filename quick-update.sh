#!/bin/bash

echo "🔄 Quick update to GitHub..."

# Check if GIT_TOKEN exists
if [ -z "$GIT_TOKEN" ]; then
    echo "❌ Error: GIT_TOKEN not found"
    exit 1
fi

# Add changes
git add .

# Commit
git commit -m "Fix: Include devDependencies in Render build"

# Push
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Update pushed successfully!"
    echo ""
    echo "🔄 Render will auto-deploy the fix now"
    echo ""
else
    echo "❌ Push failed"
    exit 1
fi
