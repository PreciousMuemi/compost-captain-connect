#!/bin/bash

# 🚀 Compost Captain Connect - Deployment Script

echo "🚀 Starting deployment preparation..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Please create one with your Supabase keys:"
    echo "   VITE_SUPABASE_URL=https://qoplbnyngttwkiaovwyy.supabase.co"
    echo "   VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here"
fi

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

# Check if dist folder exists
if [ -d "dist" ]; then
    echo "✅ Build output found in dist/ folder"
    echo "📊 Build size:"
    du -sh dist/
else
    echo "❌ Build output not found. Check build errors."
    exit 1
fi

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Push to GitHub: git push origin main"
echo "2. Deploy to Vercel: https://vercel.com/new"
echo "3. Add environment variables in Vercel dashboard"
echo "4. Test your deployed app"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions" 