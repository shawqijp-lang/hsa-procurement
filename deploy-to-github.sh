#!/bin/bash

echo "🚀 Deploying to GitHub..."

# Check if GIT_TOKEN exists
if [ -z "$GIT_TOKEN" ]; then
    echo ""
    echo "❌ Error: GIT_TOKEN not found"
    echo ""
    echo "📝 Please follow these steps:"
    echo ""
    echo "1. Create GitHub Token:"
    echo "   👉 https://github.com/settings/tokens/new"
    echo ""
    echo "2. Settings:"
    echo "   - Note: Replit Deploy"
    echo "   - Expiration: No expiration"
    echo "   - Scopes: ✅ repo"
    echo ""
    echo "3. Copy the token (starts with ghp_)"
    echo ""
    echo "4. Add to Replit Secrets:"
    echo "   Tools → Secrets → New Secret"
    echo "   Key: GIT_TOKEN"
    echo "   Value: (paste your token)"
    echo ""
    echo "5. Run this script again: ./deploy-to-github.sh"
    echo ""
    exit 1
fi

# Configure git
git config --global user.email "deploy@hsa.com"
git config --global user.name "HSA Deploy"

# Check current status
echo "📋 Checking repository status..."
git status --short

# Add all files
echo "📦 Adding all files..."
git add -A

# Commit if there are changes
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "💾 Committing changes..."
    git commit -m "Deploy complete application to production"
fi

# Setup remote with token
echo "🔗 Setting up GitHub remote..."
REPO_URL="https://${GIT_TOKEN}@github.com/shawqijp-lang/hsa-procurement.git"

# Remove existing remote if exists
git remote remove origin 2>/dev/null || true

# Add new remote
git remote add origin "$REPO_URL"

# Force push to GitHub
echo "⬆️  Pushing to GitHub..."
git push -u origin main --force

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Code pushed to GitHub!"
    echo ""
    echo "🌐 Repository: https://github.com/shawqijp-lang/hsa-procurement"
    echo ""
    echo "📌 Next Steps:"
    echo "1. Go to: https://dashboard.render.com"
    echo "2. New + → Web Service"
    echo "3. Connect: hsa-procurement"
    echo "4. Deploy!"
    echo ""
else
    echo ""
    echo "❌ Push failed. Check your GIT_TOKEN."
    echo ""
    exit 1
fi
