#!/bin/bash

# Friends Media House - Quick Setup Script
# This script helps you set up your local environment quickly

echo "🚀 Friends Media House - Quick Setup"
echo "===================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Vercel CLI not found. Installing..."
    npm install -g vercel
    echo "✅ Vercel CLI installed!"
else
    echo "✅ Vercel CLI already installed"
fi

echo ""
echo "🔐 Please login to Vercel..."
vercel login

echo ""
echo "🔗 Linking project to Vercel..."
vercel link

echo ""
echo "📥 Pulling environment variables from Vercel..."
vercel env pull

if [ -f .env ]; then
    echo "✅ Environment variables downloaded successfully!"
    echo ""
    echo "📋 Environment file created: .env"
    echo ""
    echo "Next steps:"
    echo "1. Install dependencies: npm install"
    echo "2. Run development server: npm run dev"
    echo "3. Open http://localhost:3000"
else
    echo "❌ Failed to download environment variables"
    echo "Please make sure you've:"
    echo "1. Created a project on Vercel"
    echo "2. Added environment variables in Vercel dashboard"
    echo "3. Have proper access to the project"
fi

echo ""
echo "📚 For more help, see:"
echo "  - VERCEL-DEPLOYMENT-GUIDE.md"
echo "  - SETUP-CONFIGURATION.md"
