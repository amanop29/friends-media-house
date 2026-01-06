# Friends Media House - Complete Deployment & Going Live Guide

This comprehensive guide walks you through deploying your application to production, configuring your domain with Hostinger, and setting up CDN for optimal performance.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Step 1: Domain Setup with Hostinger](#step-1-domain-setup-with-hostinger)
3. [Step 2: Prepare Application for Production](#step-2-prepare-application-for-production)
4. [Step 3: Deploy to Vercel](#step-3-deploy-to-vercel)
5. [Step 4: Configure Cloudflare CDN](#step-4-configure-cloudflare-cdn)
6. [Step 5: Setup R2 for Media Storage](#step-5-setup-r2-for-media-storage)
7. [Step 6: DNS Configuration](#step-6-dns-configuration)
8. [Step 7: SSL/HTTPS Setup](#step-7-ssltls-setup)
9. [Step 8: Performance Optimization](#step-8-performance-optimization)
10. [Step 9: Monitoring & Maintenance](#step-9-monitoring--maintenance)

---

## Pre-Deployment Checklist

Before going live, ensure you have:

- [ ] All environment variables configured locally
- [ ] Database schema deployed to Supabase
- [ ] R2 storage bucket created with public access
- [ ] Resend email API key for transactional emails
- [ ] GitHub account for linking with Vercel
- [ ] Domain registered (or ready to register)
- [ ] Admin credentials created and tested
- [ ] Website tested thoroughly in production build (`npm run build && npm run start`)

---

## Step 1: Domain Setup with Hostinger

### 1.1 Purchase Domain

1. **Go to Hostinger**: https://www.hostinger.com
2. **Search for your domain** (e.g., friendsmediahouse.com)
3. **Add to cart** and complete purchase
4. **Keep Hostinger's nameservers** for now (you'll change these later)

### 1.2 Access Domain Settings in Hostinger

1. Log in to Hostinger dashboard
2. Go to **Domains** → Select your domain
3. Navigate to **Nameservers** section
4. **Note the current nameservers** (we'll point these to Cloudflare)

### 1.3 Temporarily Disable Hostinger Hosting

Since we're using Vercel for hosting, disable Hostinger's built-in hosting:

1. In domain settings, find **Hosting** section
2. Set to **Do Not Host** or disable hosting
3. This prevents conflicts with Vercel

---

## Step 2: Prepare Application for Production

### 2.1 Optimize Next.js Configuration

Edit `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.friendsmediahouse.com',
        pathname: '/**',
      },
    ],
    minimumCacheTTL: 60,
    unoptimized: false,
  },
  compress: true,
  swcMinify: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
```

### 2.2 Create Production Environment File

Create `.env.production` in your project root:

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Admin only (server-side only)
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# R2 Storage
NEXT_PUBLIC_R2_BUCKET_NAME=friendsmediahouse
NEXT_PUBLIC_R2_CUSTOM_DOMAIN=https://media.friendsmediahouse.com

R2_ACCOUNT_ID=YOUR_ACCOUNT_ID
R2_ACCESS_KEY_ID=YOUR_ACCESS_KEY
R2_SECRET_ACCESS_KEY=YOUR_SECRET_KEY

# Email
RESEND_API_KEY=YOUR_RESEND_KEY

# App Settings
NEXT_PUBLIC_APP_URL=https://friendsmediahouse.com
NEXT_PUBLIC_CDN_URL=https://media.friendsmediahouse.com
NEXT_PUBLIC_ADMIN_URL=https://admin.friendsmediahouse.com
```

### 2.3 Build and Test Production Build

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm run start

# Test at http://localhost:3000
```

✅ If no errors and website works → Ready for deployment

---

## Step 3: Deploy to Vercel

### 3.1 Connect GitHub Repository

1. **Push code to GitHub** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/friends-media-house.git
   git push -u origin main
   ```

2. **Create Vercel Account**: https://vercel.com/signup

### 3.2 Import Project to Vercel

1. Go to Vercel dashboard
2. Click **"New Project"**
3. Click **"Import Git Repository"**
4. Search and select your GitHub repo
5. Click **"Import"**

### 3.3 Configure Environment Variables in Vercel

1. In project settings, go to **Settings** → **Environment Variables**
2. Add all variables from `.env.production`:

| Variable | Value | Type |
|----------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Secret |
| `NEXT_PUBLIC_R2_BUCKET_NAME` | friendsmediahouse | Public |
| `NEXT_PUBLIC_R2_CUSTOM_DOMAIN` | https://media.friendsmediahouse.com | Public |
| `R2_ACCOUNT_ID` | Your R2 account ID | Secret |
| `R2_ACCESS_KEY_ID` | Your R2 access key | Secret |
| `R2_SECRET_ACCESS_KEY` | Your R2 secret | Secret |
| `RESEND_API_KEY` | Your Resend API key | Secret |
| `NEXT_PUBLIC_APP_URL` | https://friendsmediahouse.com | Public |
| `NEXT_PUBLIC_CDN_URL` | https://media.friendsmediahouse.com | Public |

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (~5-10 minutes)
3. Copy your Vercel project URL (e.g., `friendsmediahouse.vercel.app`)
4. Test at https://friendsmediahouse.vercel.app

---

## Step 4: Configure Cloudflare CDN

### 4.1 Create Cloudflare Account

1. Go to https://cloudflare.com
2. Sign up for free account
3. Complete email verification

### 4.2 Add Domain to Cloudflare

1. In Cloudflare dashboard, click **"Add site"**
2. Enter: `friendsmediahouse.com`
3. Select **Free plan** (sufficient for starting)
4. Click **"Add site"**

### 4.3 Update Nameservers in Hostinger

Cloudflare will show you 2 nameservers, example:
- `amelia.ns.cloudflare.com`
- `brody.ns.cloudflare.com`

**Step-by-Step: Change Nameservers in Hostinger Dashboard**

1. **Log in to Hostinger**: https://www.hostinger.com/login
2. Go to **Domains** section (usually on left sidebar)
3. Find your domain and click on it (e.g., friendsmediahouse.com)
4. Look for **Nameservers** or **DNS** settings
5. Click **Edit Nameservers** or **Manage DNS**
6. You'll see current nameservers (Hostinger defaults), delete them
7. Enter the **Cloudflare nameservers**:
   - **Nameserver 1**: `amelia.ns.cloudflare.com` (or whatever Cloudflare shows)
   - **Nameserver 2**: `brody.ns.cloudflare.com` (or whatever Cloudflare shows)
8. Click **Save** or **Update**
9. ⏱️ **Wait 24-48 hours for DNS propagation** (can be instant sometimes)

> **Visual Guide:**
> ```
> Hostinger Dashboard
> └── Domains
>     └── friendsmediahouse.com
>         └── Manage
>             └── Nameservers / DNS Settings
>                 └── Edit Nameservers
>                     ├── Delete old nameservers
>                     ├── Add: amelia.ns.cloudflare.com
>                     ├── Add: brody.ns.cloudflare.com
>                     └── Save
> ```

**⚠️ Important:** Since you only purchased the **domain** from Hostinger (not their hosting), all DNS and subdomain management happens in **Cloudflare**, not Hostinger. After changing nameservers to Cloudflare, you don't need to do anything else in Hostinger.

### 4.4 Create DNS Records in Cloudflare

1. In Cloudflare dashboard, go to **DNS**
2. Create the following records:

| Type | Name | Content | TTL | Proxy |
|------|------|---------|-----|-------|
| CNAME | friendsmediahouse.com | cname.vercel-dns.com | Auto | Proxied |
| CNAME | www | cname.vercel-dns.com | Auto | Proxied |
| CNAME | media | friendsmediahouse.<your-account-id>.r2.cloudflarestorage.com | Auto | Proxied |
| CNAME | admin | cname.vercel-dns.com | Auto | Proxied |

> **How to add subdomains in Cloudflare:**
> - Click **"Add record"**
> - **Type**: CNAME
> - **Name**: Enter subdomain (e.g., `media`, `admin`, `www`)
> - **Content**: Enter target domain (e.g., `cname.vercel-dns.com`)
> - **TTL**: Auto
> - **Proxy status**: Proxied (orange cloud icon)
> - Click **Save**

This creates:
- `www.friendsmediahouse.com` → Vercel
- `admin.friendsmediahouse.com` → Vercel (admin dashboard)
- `media.friendsmediahouse.com` → R2 storage (CDN)
- `friendsmediahouse.com` (apex) → Vercel (main site)

### 4.5 Configure Cloudflare Settings

1. Go to **SSL/TLS** → Set to **Full (strict)**
2. Go to **Caching** → Set browser cache TTL to **1 hour**
3. Go to **Rules** → **Page Rules** (or use WAF):
   - Enable compression
   - Enable Brotli compression
   - Cache static assets for 30 days

---

## Step 5: Setup R2 for Media Storage

### 5.1 Create R2 Bucket

1. In Cloudflare dashboard, go to **R2**
2. Click **"Create bucket"**
3. Name: `friendsmediahouse`
4. Choose region closest to users
5. Click **"Create bucket"**

### 5.2 Create Custom Domain for R2

1. Go to **R2** → **Settings** → **Custom Domains**
2. Click **"Add custom domain"**
3. Enter: `media.friendsmediahouse.com`
4. Click **"Add domain"**
5. Copy the CNAME target (will be used in DNS)

### 5.3 Create R2 API Token

1. Go to **R2** → **Settings** → **API Tokens**
2. Click **"Create API token"**
3. Name: `friendsmediahouse-upload`
4. Permissions: **Object Read & Write**
5. TTL: **Custom** → Set to 6 months
6. Copy and save:
   - Account ID
   - Access Key ID
   - Secret Access Key

### 5.4 Set Public Access

1. In your bucket, go to **Settings**
2. Find **Public access**
3. Click **"Allow public access"**
4. Confirm

### 5.5 Update CORS (for uploads)

1. Go to bucket **Settings** → **CORS**
2. Add CORS policy:

```json
[
  {
    "AllowedOrigins": [
      "https://friendsmediahouse.com",
      "https://www.friendsmediahouse.com",
      "https://admin.friendsmediahouse.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## Step 6: DNS Configuration

### 6.1 Complete DNS Setup Checklist

Ensure all these records exist in Cloudflare:

```
friendsmediahouse.com  CNAME  cname.vercel-dns.com
www                    CNAME  cname.vercel-dns.com
admin                  CNAME  cname.vercel-dns.com
media                  CNAME  (R2 custom domain CNAME)
```

### 6.2 Add Domain to Vercel

1. In Vercel project settings, go to **Domains**
2. Add `friendsmediahouse.com`
3. Vercel might suggest additional DNS records - add them if needed
4. Add `www.friendsmediahouse.com`
5. Add `admin.friendsmediahouse.com`

### 6.3 Verify DNS Propagation

```bash
# Check DNS resolution
nslookup friendsmediahouse.com
dig friendsmediahouse.com

# Should resolve to Vercel's IP
# Should see nameservers pointing to Cloudflare
```

---

## Step 7: SSL/TLS Setup

### 7.1 Enable HTTPS on Cloudflare

1. In Cloudflare dashboard, go to **SSL/TLS**
2. **Set encryption mode** to: **Full (Strict)**
3. This requires valid certificate on origin (Vercel provides automatically)

### 7.2 Redirect HTTP to HTTPS

1. Go to **Cloudflare** → **Rules** → **Page Rules**
2. Create rule:
   - **URL**: `http://friendsmediahouse.com/*`
   - **Action**: Always Use HTTPS

### 7.3 Verify HTTPS

```bash
# Should return 200 OK and valid certificate
curl -I https://friendsmediahouse.com

# Should redirect from HTTP to HTTPS
curl -I http://friendsmediahouse.com
```

---

## Step 8: Performance Optimization

### 8.1 Enable Image Optimization

In Cloudflare **Speed** settings:
- ✅ Brotli compression
- ✅ Minify JavaScript, CSS, HTML
- ✅ Polish (image optimization)
- ✅ Auto Minify

### 8.2 Cache Configuration

**For static assets** (update `next.config.mjs`):

```javascript
headers: async () => {
  return [
    {
      source: '/_next/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/images/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=2592000',
        },
      ],
    },
  ];
},
```

### 8.3 Content Delivery

- ✅ Images served from R2 CDN (media.friendsmediahouse.com)
- ✅ Static assets cached globally
- ✅ Dynamic pages rendered on-demand

### 8.4 Monitor Performance

1. Go to **Vercel** → **Analytics**
2. Track:
   - Page load times
   - Core Web Vitals
   - Error rates

2. In **Cloudflare** → **Analytics**
3. Track:
   - Requests and bandwidth
   - Cache hit ratio
   - Security events

---

## Step 9: Monitoring & Maintenance

### 9.1 Set Up Alerts

**In Vercel:**
1. Go to **Project Settings** → **Alerts**
2. Enable:
   - Deploy errors
   - Build failures
   - Performance degradation

**In Cloudflare:**
1. Go to **Notifications**
2. Enable:
   - Certificate expiring soon
   - Under attack mode
   - Web Application Firewall events

### 9.2 Regular Maintenance Tasks

**Weekly:**
- Check error logs in Vercel
- Monitor database performance in Supabase
- Check R2 storage usage

**Monthly:**
- Review analytics
- Check for security updates
- Verify SSL certificate validity
- Update dependencies: `npm update`

### 9.3 Database Backups

1. In **Supabase** → **Settings** → **Backups**
2. Enable automatic daily backups
3. Download backups monthly for safe storage

### 9.4 Log Monitoring

**Setup error tracking:**

```typescript
// In your API routes or pages
import { captureException } from '@sentry/nextjs'; // Optional

try {
  // Your code
} catch (error) {
  console.error('Error:', error);
  captureException(error);
}
```

---

## Verification Checklist - Go Live Ready

- [ ] Domain resolves to Vercel (https://friendsmediahouse.com works)
- [ ] Admin subdomain works (https://admin.friendsmediahouse.com)
- [ ] Media CDN works (https://media.friendsmediahouse.com/image.jpg)
- [ ] HTTPS enabled and valid certificate
- [ ] Images load from R2 CDN
- [ ] Database connected and working
- [ ] Email sending works (test via admin contact form)
- [ ] Admin login works
- [ ] Image upload works
- [ ] Gallery displays correctly
- [ ] Events page loads
- [ ] Mobile responsive on all pages
- [ ] Console has no errors
- [ ] Analytics dashboard working

---

## Troubleshooting

### Domain not resolving

```bash
# Check nameservers
whois friendsmediahouse.com | grep "Name Server"

# Should show Cloudflare nameservers
# If not, wait 24-48 hours for propagation
```

### Images not loading from CDN

1. Verify R2 bucket is public
2. Check CORS configuration
3. Verify custom domain is set correctly
4. Check `next.config.mjs` remotePatterns

### Database connection failed

1. Verify `.env.production` has correct Supabase URL
2. Check Supabase project is running
3. Verify RLS policies aren't blocking queries
4. Test connection: `curl https://YOUR_PROJECT.supabase.co/rest/v1/events?limit=1`

### Slow page loads

1. Check Vercel analytics
2. Review Cloudflare cache hit ratio (should be >80%)
3. Optimize images using Next.js Image component
4. Check database query performance in Supabase

### SSL/TLS certificate issues

1. In Cloudflare, ensure "Full (Strict)" mode
2. Vercel auto-manages certificate
3. If stuck, regenerate in Vercel settings

---

## Cost Breakdown (Monthly Estimate)

| Service | Free Tier | Paid Tier | Notes |
|---------|-----------|-----------|-------|
| Vercel | ✅ 100GB bandwidth | $20+/mo | Includes analytics |
| Cloudflare | ✅ Free CDN | $20+/mo | Pro plan recommended |
| Supabase | ✅ 500MB DB | $25+/mo | 1GB free tier sufficient |
| R2 Storage | - | $0.015/GB | No egress fees |
| Resend Email | ✅ 100/day free | $20+/mo | 100/day free usually sufficient |
| Hostinger Domain | - | $2.99-12.99/year | One-time domain cost |
| **Total** | **~$0-50/month** | **$65-100/month** | Start free, scale as needed |

---

## Next Steps After Going Live

1. **Share your website** with users
2. **Monitor analytics** daily for first week
3. **Gather user feedback** on performance
4. **Set up email marketing** (if needed)
5. **Plan content updates** and event additions
6. **Consider advanced features**:
   - Email notifications for new events
   - Social media integration
   - Advanced analytics
   - Booking system

---

## Support & Documentation

- **Vercel Docs**: https://vercel.com/docs
- **Cloudflare Docs**: https://developers.cloudflare.com/
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

**🎉 Congratulations! Your site is now live!**
