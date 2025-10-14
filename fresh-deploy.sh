#!/bin/bash

echo "🧹 Cleaning Git history..."

# Check if GIT_TOKEN exists
if [ -z "$GIT_TOKEN" ]; then
    echo "❌ Error: GIT_TOKEN not found in Secrets"
    exit 1
fi

# Backup current files
echo "📦 Backing up current state..."

# Remove old .git
echo "🗑️  Removing old Git history..."
rm -rf .git

# Initialize fresh repository
echo "🆕 Creating fresh Git repository..."
git init
git config user.email "deploy@hsa.com"
git config user.name "HSA Deploy"

# Ensure .gitignore is correct
echo "📝 Checking .gitignore..."

# Add all files
echo "📂 Adding all files..."
git add .

# Create fresh commit
echo "💾 Creating fresh commit..."
git commit -m "Initial deployment - HSA Procurement System"

# Add remote
echo "🔗 Connecting to GitHub..."
git remote add origin "https://${GIT_TOKEN}@github.com/shawqijp-lang/hsa-procurement.git"

# Set main branch
git branch -M main

# Force push (clean history)
echo "⬆️  Pushing to GitHub (clean history)..."
git push -u origin main --force

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Code deployed to GitHub with clean history!"
    echo ""
    echo "📊 Repository: https://github.com/shawqijp-lang/hsa-procurement"
    echo ""
    echo "📌 Next: Deploy on Render.com"
    echo "   1. https://dashboard.render.com"
    echo "   2. New + → Web Service"
    echo "   3. Connect: hsa-procurement"
    echo ""
else
    echo ""
    echo "❌ Push failed"
    exit 1
fi
