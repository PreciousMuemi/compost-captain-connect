# 🚀 Deployment Guide - Compost Captain Connect

## **Platform: Vercel (Recommended)**

### **Prerequisites:**
1. **GitHub Account** - Your code should be on GitHub
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Supabase Project** - Already configured

---

## **Step 1: Prepare Your Code**

### **1.1 Get Your Supabase Keys**
1. Go to: https://supabase.com/dashboard/project/qoplbnyngttwkiaovwyy/settings/api
2. Copy your **Project URL** and **anon/public key**

### **1.2 Update Environment Variables**
Create a `.env` file in your project root:
```bash
VITE_SUPABASE_URL=https://qoplbnyngttwkiaovwyy.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

### **1.3 Commit Your Changes**
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

---

## **Step 2: Deploy to Vercel**

### **2.1 Connect to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Import your GitHub repository
4. Select the repository: `compost-captain-connect`

### **2.2 Configure Project Settings**
- **Framework Preset:** Vite
- **Root Directory:** `./` (default)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### **2.3 Add Environment Variables**
In Vercel dashboard, go to **Settings > Environment Variables**:
```
VITE_SUPABASE_URL=https://qoplbnyngttwkiaovwyy.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

### **2.4 Deploy**
Click **"Deploy"** and wait for build to complete!

---

## **Step 3: Post-Deployment**

### **3.1 Test Your App**
1. Visit your Vercel URL
2. Test all features:
   - ✅ User authentication
   - ✅ USSD integration
   - ✅ Product purchases
   - ✅ Waste reporting
   - ✅ Admin dashboard

### **3.2 Custom Domain (Optional)**
1. Go to **Settings > Domains**
2. Add your custom domain
3. Configure DNS settings

---

## **Step 4: Continuous Deployment**

### **4.1 Automatic Deployments**
- Every push to `main` branch = automatic deployment
- Every pull request = preview deployment

### **4.2 Environment Variables**
- **Production:** Set in Vercel dashboard
- **Preview:** Can override for testing

---

## **Alternative: Netlify Deployment**

If you prefer Netlify:

### **1. Connect to Netlify**
1. Go to [netlify.com](https://netlify.com)
2. Click **"New site from Git"**
3. Connect your GitHub repository

### **2. Build Settings**
- **Build command:** `npm run build`
- **Publish directory:** `dist`

### **3. Environment Variables**
Add in **Site settings > Environment variables**:
```
VITE_SUPABASE_URL=https://qoplbnyngttwkiaovwyy.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

---

## **🔧 Troubleshooting**

### **Build Errors**
```bash
# Check build locally
npm run build

# Check for missing dependencies
npm install
```

### **Environment Variables**
- Ensure all `VITE_` variables are set in Vercel
- Check Supabase keys are correct

### **Supabase Connection**
- Verify your Supabase project is active
- Check RLS policies are correct
- Test Edge Functions are deployed

---

## **📊 Monitoring**

### **Vercel Analytics**
- Built-in performance monitoring
- Real-time user analytics
- Error tracking

### **Supabase Dashboard**
- Database performance
- Function logs
- Real-time subscriptions

---

## **🎯 Next Steps**

1. **Deploy Edge Functions** (if not already done)
2. **Set up monitoring** and alerts
3. **Configure backups** for Supabase
4. **Set up CI/CD** for automated testing

---

## **📞 Support**

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Project Issues:** Create GitHub issues

---

**🎉 Your app is now live!** 