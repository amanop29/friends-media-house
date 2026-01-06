# Friends Media House - Vercel Deployment Guide

Complete step-by-step guide to deploy your Friends Media House website to Vercel.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Variables Setup](#environment-variables-setup)
3. [Deploy to Vercel](#deploy-to-vercel)
4. [Domain Configuration](#domain-configuration)
5. [Post-Deployment Setup](#post-deployment-setup)
6. [Troubleshooting](#troubleshooting)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

Before deploying to Vercel, ensure you have:

### ✅ Required Services Configured

- [ ] **Supabase Database**: Project created with all tables from `DATABASE-SCHEMA-COMPLETE.sql`
- [ ] **Cloudflare R2**: Bucket created for media storage with public access
- [ ] **Resend API**: Account created for email notifications
- [ ] **GitHub Repository**: Code pushed to GitHub (already done ✓)
- [ ] **Domain Name**: Purchased and ready (optional but recommended)

### ✅ Development Testing

- [ ] Application runs locally without errors (`npm run dev`)
- [ ] Production build completes successfully (`npm run build`)
- [ ] All environment variables tested in `.env.local`
- [ ] Admin login tested and working
- [ ] Media upload tested with R2 storage

---

## Environment Variables Setup

### 🚀 Automated Setup (Recommended)

**The easiest way to manage environment variables is using Vercel CLI:**

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Login to Vercel
```bash
vercel login
```

#### Step 3: Link Your Project
```bash
vercel link
```
This will link your local project to your Vercel project.

#### Step 4: Pull Environment Variables
```bash
vercel env pull
```

This automatically creates a `.env` file with all environment variables from your Vercel project!

**Benefits:**
- ✅ No manual copying of environment variables
- ✅ Always in sync with Vercel project
- ✅ Works for Development, Preview, and Production environments
- ✅ Easy to update: just run `vercel env pull` again

---

### 📝 Manual Setup (Alternative)

**If you prefer to add environment variables manually in Vercel dashboard:**

### Required Environment Variables

You'll need to add these in Vercel dashboard. Here's the complete list:

#### 1. **Supabase Configuration**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to find:**
- Go to your Supabase project dashboard
- Navigate to **Settings → API**
- Copy URL and keys from the API settings page

#### 2. **Cloudflare R2 Storage**
```
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=friendsmediahouse-media
R2_PUBLIC_URL=https://your-r2-public-domain.r2.dev
```

**Where to find:**
- Go to Cloudflare dashboard → **R2**
- For Account ID: Check URL or account settings
- For Access Keys: **R2 → Manage R2 API Tokens → Create API Token**
- For Public URL: **R2 → Your Bucket → Settings → Public Access**

#### 3. **Resend Email Service**
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@friendsmediahouse.com
RESEND_TO_EMAIL=contact@friendsmediahouse.com
```

**Where to find:**
- Go to Resend dashboard: https://resend.com/api-keys
- Click **Create API Key**
- Copy the key (shown only once!)

#### 4. **Public URLs**
```
NEXT_PUBLIC_APP_URL=https://friendsmediahouse.com
NEXT_PUBLIC_ADMIN_URL=https://admin.friendsmediahouse.com
```

**Note:** Update these with your actual domain after deployment.

#### 5. **Authentication (Optional)**
```
NEXTAUTH_URL=https://friendsmediahouse.com
NEXTAUTH_SECRET=your_generated_secret_key_here
```

**Generate secret:**
```bash
openssl rand -base64 32
```

#### 6. **Admin Credentials**
```
ADMIN_EMAIL=admin@friendsmediahouse.com
```

---

## Deploy to Vercel

### 🚀 Option A: Deploy via CLI (Recommended)

**Fastest and easiest method:**

#### Step 1: Install Vercel CLI (if not done already)
```bash
npm install -g vercel
```

#### Step 2: Login to Vercel
```bash
vercel login
```
Follow the prompts to authenticate.

#### Step 3: Deploy
```bash
vercel
```

The CLI will:
- Ask if you want to link to existing project or create new
- Ask for project settings (use defaults)
- Deploy your project
- Provide deployment URL

#### Step 4: Add Environment Variables via CLI

You can add environment variables directly from CLI:

```bash
# Add a single variable
vercel env add NEXT_PUBLIC_SUPABASE_URL

# You'll be prompted to enter the value and select environments
```

Or add all at once by creating a `.env` file and running:
```bash
vercel env add < .env.example
```

Then pull them locally:
```bash
vercel env pull
```

#### Step 5: Deploy to Production
```bash
vercel --prod
```

---

### 📱 Option B: Deploy via Dashboard

**If you prefer the web interface:**

### Step 1: Create Vercel Account

1. Go to https://vercel.com
2. Click **Sign Up**
3. Choose **Continue with GitHub**
4. Authorize Vercel to access your GitHub account

### Step 2: Import Project

1. After logging in, click **Add New → Project**
2. Find your `friends-media-house` repository
3. Click **Import**

### Step 3: Configure Project Settings

#### Framework Preset
- Should auto-detect as **Next.js** ✓

#### Root Directory
- Leave as `.` (root)

#### Build Settings
- **Build Command:** `npm run build` (auto-filled)
- **Output Directory:** `.next` (auto-filled)
- **Install Command:** `npm install` (auto-filled)

#### Environment Variables

Click **Environment Variables** and add ALL the variables from the list above:

1. Click **Add** for each variable
2. Enter **Key** (variable name)
3. Enter **Value** (the actual value)
4. Select environment: **Production**, **Preview**, and **Development** (check all three)
5. Repeat for all variables

**Important:** Make sure variable names use underscores, not hyphens:
- ✓ `R2_ACCESS_KEY_ID`
- ✗ `R2-ACCESS-KEY-ID`

### Step 4: Deploy

1. After adding all environment variables, click **Deploy**
2. Wait for the build to complete (usually 2-5 minutes)
3. Once completed, you'll see a success message with your deployment URL

### Step 5: Verify Deployment

1. Click on the deployment URL (e.g., `friends-media-house.vercel.app`)
2. Test the following:
   - Homepage loads correctly
   - Navigation works
   - Gallery page loads
   - Admin login page accessible at `/admin/login`

---

## Domain Configuration

### Option A: Using Vercel Domain (Free)

Your site is already live at `friends-media-house.vercel.app`!

### Option B: Custom Domain Setup

#### Step 1: Add Domain in Vercel

1. Go to your project in Vercel dashboard
2. Navigate to **Settings → Domains**
3. Click **Add Domain**
4. Enter your domain: `friendsmediahouse.com`
5. Click **Add**

#### Step 2: Configure DNS

Vercel will provide DNS records. You have two options:

**Option 1: Vercel Nameservers (Recommended)**
1. Vercel provides nameservers like:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
2. Go to your domain registrar (Hostinger)
3. Navigate to **Domain → Nameservers**
4. Replace existing nameservers with Vercel's nameservers
5. Wait for propagation (5 minutes - 48 hours)

**Option 2: CNAME Record**
1. In your DNS provider (Hostinger), add a CNAME record:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
2. For root domain (`friendsmediahouse.com`), add an A record:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```

#### Step 3: Add Admin Subdomain (Optional)

To have a separate admin panel at `admin.friendsmediahouse.com`:

1. In Vercel, click **Add Domain** again
2. Enter `admin.friendsmediahouse.com`
3. Add the DNS record provided by Vercel

#### Step 4: Wait for SSL Certificate

- Vercel automatically provisions SSL certificates
- This takes 1-5 minutes after DNS propagation
- Your site will be accessible via HTTPS

#### Step 5: Update Environment Variables

After domain is active:

1. Go to **Settings → Environment Variables**
2. Update these variables with your actual domain:
   ```
   NEXT_PUBLIC_APP_URL=https://friendsmediahouse.com
   NEXT_PUBLIC_ADMIN_URL=https://admin.friendsmediahouse.com
   NEXTAUTH_URL=https://friendsmediahouse.com
   ```
3. Trigger a redeploy: **Deployments → ••• → Redeploy**

---

## Post-Deployment Setup

### 1. Database Setup

Run the SQL schema in Supabase:

1. Open Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy content from `DATABASE-SCHEMA-COMPLETE.sql`
4. Click **Run**
5. Verify all tables are created

### 2. Create Admin User

In Supabase SQL Editor, run:

```sql
INSERT INTO admin_users (email, password_hash, role, is_active)
VALUES (
  'admin@friendsmediahouse.com',
  crypt('your_secure_password', gen_salt('bf')),
  'super_admin',
  true
);
```

### 3. Configure R2 Public Access

1. Go to Cloudflare dashboard → **R2 → Your Bucket**
2. Click **Settings**
3. Under **Public Access**, click **Allow Access**
4. Copy the Public URL
5. Update `R2_PUBLIC_URL` in Vercel environment variables

### 4. Setup Email Domain (Optional)

For custom email addresses (noreply@friendsmediahouse.com):

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain: `friendsmediahouse.com`
4. Add the provided DNS records to your domain
5. Wait for verification (usually instant)

### 5. Test All Features

- [ ] Homepage loads
- [ ] Gallery displays photos
- [ ] Event detail pages work
- [ ] Contact form sends emails
- [ ] Admin login successful
- [ ] Photo upload works
- [ ] Video management works

---

## Troubleshooting

### Build Fails with "Module not found"

**Solution:**
```bash
# Locally, delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

### Environment Variable Errors

**Solution:**
- Go to **Settings → Environment Variables**
- Click **••• → Edit** next to the variable
- Ensure no extra spaces in the value
- Click **Save**
- Redeploy the project

### Images Not Loading

**Possible causes:**
1. **R2_PUBLIC_URL not set correctly**
   - Check if it ends with `.r2.dev`
   - Remove trailing slash if present

2. **R2 bucket not public**
   - Go to R2 bucket settings
   - Enable public access

3. **Image domains not configured**
   - Check `next.config.mjs` has correct domains in `remotePatterns`

### Database Connection Fails

**Solution:**
1. Verify Supabase URL is correct
2. Check if Supabase project is paused (free tier)
3. Verify service role key has proper permissions

### 500 Internal Server Error

**Check logs:**
1. In Vercel dashboard, go to **Deployments**
2. Click on the latest deployment
3. Go to **Runtime Logs**
4. Look for error messages

Common fixes:
- Missing environment variables
- Database connection issues
- R2 credentials incorrect

### Build Warnings about TypeScript

Currently, the project has `ignoreBuildErrors: true` in `next.config.mjs`. This is acceptable for initial deployment, but you may want to fix TypeScript errors later.

To see TypeScript errors:
```bash
npm run type-check
```

---

## Monitoring & Maintenance

### Monitor Deployment Status

1. **Vercel Dashboard**
   - View real-time deployment status
   - Check build logs
   - Monitor function invocations

2. **Analytics** (Built-in)
   - Go to **Analytics** tab in Vercel
   - View page views, top pages, and performance

3. **Speed Insights** (Optional - Paid)
   - Enable in project settings
   - Get Core Web Vitals data

### Automatic Deployments

Every time you push to GitHub:
- **main branch** → Production deployment
- **Other branches** → Preview deployments

### Manual Redeploy

If you need to redeploy without code changes:
1. Go to **Deployments**
2. Click **•••** on latest deployment
3. Select **Redeploy**

### Update Environment Variables

When you update environment variables:
1. The changes apply to **new deployments** only
2. You must **redeploy** to apply changes to production

### Monitor Database

1. **Supabase Dashboard → Database → Tables**
   - Check table sizes
   - Monitor row counts

2. **Database Usage**
   - Free tier: 500 MB storage, 2 GB bandwidth
   - Upgrade if needed

### Monitor R2 Storage

1. **Cloudflare → R2 → Your Bucket**
   - Check storage usage
   - Free tier: 10 GB storage, 10 million requests/month

### Backup Strategy

1. **Database Backup (Supabase)**
   - Automatic daily backups on paid plans
   - Manual backup: Export via SQL Editor

2. **Media Backup (R2)**
   - Download bucket contents using CLI or API
   - Store backups in a separate location

---

## Performance Optimization

### 1. Enable Image Optimization

Already configured in `next.config.mjs`:
- AVIF and WebP formats
- Automatic image sizing
- Cache control headers

### 2. Analytics & Speed Insights

Enable in Vercel project settings:
- Real user monitoring
- Core Web Vitals tracking
- Performance recommendations

### 3. Edge Functions

Your API routes automatically run on Vercel Edge Network for optimal performance.

### 4. Caching Strategy

Static assets are cached automatically:
- Images: 1 year
- Static files: 1 year
- Dynamic content: Per-request

---

## Deployment Checklist

Use this checklist for each deployment:

### Pre-Deployment
- [ ] Test locally with production build
- [ ] All environment variables ready
- [ ] Database schema updated
- [ ] No console errors in browser

### During Deployment
- [ ] All environment variables added to Vercel
- [ ] Domain DNS records updated
- [ ] SSL certificate issued

### Post-Deployment
- [ ] Homepage loads correctly
- [ ] Admin panel accessible
- [ ] Database connection working
- [ ] Media upload functional
- [ ] Email sending works
- [ ] All pages load without errors

### Ongoing
- [ ] Monitor deployment logs
- [ ] Check analytics regularly
- [ ] Update dependencies monthly
- [ ] Backup database weekly

---

## Useful Commands

### Test Production Build Locally
```bash
npm run build
npm run start
```

### Check for TypeScript Errors
```bash
npm run type-check
```

### Check for Linting Issues
```bash
npm run lint
```

### Update Dependencies
```bash
npm update
npm outdated
```

---

## Support & Resources

### Official Documentation
- **Vercel:** https://vercel.com/docs
- **Next.js:** https://nextjs.org/docs
- **Supabase:** https://supabase.com/docs
- **Cloudflare R2:** https://developers.cloudflare.com/r2/

### Quick Links
- **Vercel Dashboard:** https://vercel.com/dashboard
- **GitHub Repository:** https://github.com/amanop29/friends-media-house
- **Supabase Dashboard:** https://app.supabase.com
- **Cloudflare Dashboard:** https://dash.cloudflare.com

---

## Conclusion

Your Friends Media House website is now deployed and ready for production! 🎉

**Next Steps:**
1. Test all features thoroughly
2. Share the URL with stakeholders
3. Monitor performance and errors
4. Plan for future updates and improvements

If you encounter any issues, refer to the troubleshooting section or check the Vercel logs for detailed error messages.

---

**Last Updated:** January 2026  
**Version:** 1.0.0
