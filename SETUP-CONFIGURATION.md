# Friends Media House - Setup & Configuration Guide

This document provides detailed setup instructions for all services used in the Friends Media House project.

## Tech Stack Overview

- **Frontend**: Next.js 15.1.4 with App Router & Turbopack
- **Backend**: Next.js API Routes (Node.js)
- **Database**: Supabase (PostgreSQL with RLS)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Email**: Resend (transactional email service)
- **Hosting**: Vercel (Edge Network)
- **CDN**: Cloudflare (R2 custom domain)

---

## Table of Contents

1. [Supabase Setup](#1-supabase-setup)
2. [Cloudflare R2 Setup](#2-cloudflare-r2-setup)
3. [Cloudflare CDN Setup](#3-cloudflare-cdn-setup)
4. [Resend Email Setup](#4-resend-email-setup)
5. [Vercel Deployment](#5-vercel-deployment)
6. [Domain Configuration](#6-domain-configuration)
7. [Routing Configuration](#7-routing-configuration)
8. [Environment Variables](#8-environment-variables)

---

## Domain Architecture

| Domain | Purpose | Points To | Notes |
|--------|---------|-----------|-------|
| `friendsmediahouse.com` | Main public website | Vercel | Homepage, gallery, events, contact |
| `www.friendsmediahouse.com` | Redirect to main | Vercel | Automatic redirect to apex domain |
| `admin.friendsmediahouse.com` | Admin dashboard | Vercel (same app) | Protected routes, middleware routing |
| `media.friendsmediahouse.com` | Media CDN | Cloudflare R2 | Images, videos, static assets |

---

## 1. Supabase Setup

### 1.1 Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Fill in details:
   - **Name**: friends-media-house
   - **Database Password**: (Generate strong password)
   - **Region**: Choose closest to your users (e.g., Southeast Asia)
   - **Pricing Plan**: Free tier (suitable for starting)

4. Wait for project to initialize (~2 minutes)

### 1.2 Configure Database

1. Go to **SQL Editor** in Supabase dashboard
2. Copy the entire content from `DATABASE-SCHEMA-COMPLETE.sql`
3. Paste into SQL Editor
4. Click "Run" to execute all queries
5. Verify tables created:
   - events
   - photos
   - videos
   - leads
   - reviews
   - faqs
   - photo_comments
   - activity_logs
   - categories



### 1.3 Set Up Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize confirmation and password reset emails

### 1.4 Configure Row Level Security (RLS)

The SQL schema file already includes RLS policies. Verify:

1. Go to **Authentication** → **Policies**
2. Check each table has appropriate policies:
   - **events**: Public read for visible, authenticated insert/update/delete
   - **photos**: Public read based on event visibility
   - **leads**: Insert only for public, read/update for authenticated
   - **reviews**: Public read for visible, admin write
   - **faqs**: Public read for visible, admin write

### 1.5 Get API Keys

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL**: `https://[project-id].supabase.co`
   - **anon/public key**: Used for client-side operations
   - **service_role key**: Used for server-side admin operations (⚠️ Keep secret!)

### 1.6 Create Admin User

#### Option A: Via Supabase Dashboard
1. Go to **Authentication** → **Users**
2. Click "Add User"
3. Enter:
   - **Email**: admin@friendsmediahouse.com
   - **Password**: (Generate strong password)
   - **Auto Confirm User**: ✅ Yes
4. Note the password for admin login

#### Option B: Via SQL (For admins table)
1. Go to **SQL Editor**
2. Run:
```sql
INSERT INTO admins (email, name, role, password_hash, is_active)
VALUES (
  'admin@friendsmediahouse.com',
  'Admin',
  'super_admin',
  crypt('YourSecurePassword', gen_salt('bf')),
  true
);
```

**Default Credentials** (if using localStorage fallback):
- Email: `admin@friendsmediahouse.com`
- Password: `FMH@2024Admin`

---

## 2. Cloudflare R2 Setup

### 2.1 Create R2 Bucket

1. Log in to Cloudflare Dashboard: https://dash.cloudflare.com
2. Navigate to **R2** in the sidebar
3. Click "Create bucket"
4. Configure bucket:
   - **Name**: `friends-media-house` (or your preferred name)
   - **Location**: Automatic (Cloudflare will optimize)

### 2.2 Configure Public Access

1. In your bucket settings, go to **Settings** → **Public Access**
2. Enable public access: **Allow Access**
3. Note the public bucket URL: `https://[bucket-name].[account-id].r2.cloudflarestorage.com`
4. Or set up custom domain (see Cloudflare CDN section)

### 2.3 Create API Token

1. Go to **R2** → **Manage R2 API Tokens**
2. Click "Create API Token"
3. Configure:
   - **Token Name**: friends-media-house-api
   - **Permissions**: 
     - Object Read & Write
     - Bucket Read
   - **TTL**: Never expire (or set custom duration)
   - **Bucket**: Select your bucket or choose "Apply to all buckets"

4. Click "Create API Token"
5. **IMPORTANT**: Save these values immediately (shown only once):
   - **Access Key ID**: `[your-access-key-id]`
   - **Secret Access Key**: `[your-secret-access-key]`
   - **Account ID**: Found in R2 overview page

### 2.4 Folder Structure

The application automatically creates folders:
```
friends-media-house/
├── banners/          # Homepage banners
├── logos/            # Site logos
├── avatars/          # User avatars
├── events/           # Event cover images
├── gallery/          # Gallery photos
├── reviews/          # Review images
└── videos/           # Uploaded videos
```

### 2.5 Configure CORS (if needed)

If accessing R2 directly from browser:

1. Go to bucket settings
2. Add CORS policy:
```json
[
  {
    "AllowedOrigins": ["https://friendsmediahouse.com", "https://www.friendsmediahouse.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 3. Cloudflare CDN Setup

### 3.1 Custom Domain for R2 Bucket

1. In R2 bucket settings, go to **Settings** → **Custom Domains**
2. Click "Connect Domain"
3. Enter subdomain: `media.friendsmediahouse.com`
4. Cloudflare automatically:
   - Creates DNS record
   - Provisions SSL certificate
   - Enables CDN caching

5. Update `R2_PUBLIC_URL` environment variable to: `https://media.friendsmediahouse.com`

### 3.2 Configure Cache Rules

1. Go to **Caching** → **Cache Rules**
2. Create rule for R2 content:
   - **Name**: R2 Image Caching
   - **URL Path contains**: `/gallery/`, `/events/`, `/banners/`
   - **Cache Level**: Standard
   - **Edge TTL**: 1 month
   - **Browser TTL**: 7 days

### 3.3 Enable Image Optimization (Optional)

1. Go to **Speed** → **Optimization**
2. Enable:
   - **Auto Minify**: JavaScript, CSS, HTML
   - **Brotli Compression**: On
   - **Early Hints**: On

---

## 4. Resend Email Setup

### 4.1 Create Resend Account

1. Go to https://resend.com
2. Sign up with your email
3. Verify your email address

### 4.2 Add Domain

1. Go to **Domains** → **Add Domain**
2. Enter your domain: `friendsmediahouse.com`
3. Add the following DNS records to your domain (via Cloudflare or domain registrar):

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all
```

**DKIM Records:** (Resend will provide these)
```
Type: TXT
Name: resend._domainkey
Value: [provided-by-resend]
```

**DMARC Record:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:admin@friendsmediahouse.com
```

4. Wait for DNS propagation (5-10 minutes)
5. Click "Verify Domain" in Resend dashboard
6. Status should show "Verified ✓"

### 4.3 Get API Key

1. Go to **API Keys**
2. Click "Create API Key"
3. Configure:
   - **Name**: Friends Media House Production
   - **Permission**: Full Access (or Sending Access only)

4. Copy API key: `re_xxxxxxxxxxxxxxxxxxxx`
5. Store securely (shown only once)

### 4.4 Configure Sender Email

1. Go to **Settings** → **Sending Email**
2. Set default from address: `hello@friendsmediahouse.com` or `noreply@friendsmediahouse.com`
3. Set reply-to address: `contact@friendsmediahouse.com`

### 4.5 Test Email Sending

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "hello@friendsmediahouse.com",
    "to": "admin@friendsmediahouse.com",
    "subject": "Test Email",
    "html": "<p>This is a test email from Friends Media House</p>"
  }'
```

---

## 5. Vercel Deployment

### 5.1 Prepare Repository

1. Push code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/friends-media-house.git
git push -u origin main
```

### 5.2 Connect to Vercel

1. Go to https://vercel.com
2. Sign up/login with GitHub
3. Click "Add New" → "Project"
4. Import your repository: `friends-media-house`
5. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
   - **Node Version**: 20.x

### 5.3 Configure Environment Variables

Add all environment variables (see section 7 below)

### 5.4 Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-5 minutes)
3. Vercel will provide:
   - **Production URL**: `https://friends-media-house.vercel.app`
   - **Preview URLs**: For every branch/PR

### 5.5 Configure Build Settings

1. Go to **Settings** → **General**
2. Configure:
   - **Framework**: Next.js
   - **Node.js Version**: 20.x
   - **Output Directory**: Leave default

3. Go to **Settings** → **Functions**
4. Configure:
   - **Region**: Choose closest to your Supabase region
   - **Timeout**: 10s (or more for image uploads)

---

## 6. Domain Configuration

### 6.1 Add Domain to Vercel

1. In Vercel project, go to **Settings** → **Domains**
2. Add domains:
   - `friendsmediahouse.com` (Main website)
   - `www.friendsmediahouse.com` (Redirect to main)
   - `admin.friendsmediahouse.com` (Admin panel)

3. Vercel will provide DNS records

### 6.2 Configure DNS in Cloudflare

1. Log in to Cloudflare Dashboard
2. Select your domain: `friendsmediahouse.com`
3. Go to **DNS** → **Records**

**For Root Domain (Main Website):**
```
Type: A
Name: @
IPv4 Address: 76.76.21.21 (Vercel IP - check Vercel docs for latest)
Proxy status: Proxied (orange cloud)
```

**For WWW Subdomain:**
```
Type: CNAME
Name: www
Target: cname.vercel-dns.com
Proxy status: Proxied
```

**For Admin Panel Subdomain:**
```
Type: CNAME
Name: admin
Target: cname.vercel-dns.com
Proxy status: Proxied
```

**For Media/R2 Storage Subdomain:**
```
Type: CNAME
Name: media
Target: [bucket-name].[account-id].r2.cloudflarestorage.com
Proxy status: Proxied
```

4. Wait for DNS propagation (5-60 minutes)

### 6.3 SSL/TLS Configuration

1. In Cloudflare, go to **SSL/TLS**
2. Set SSL/TLS encryption mode: **Full (strict)**
3. Enable:
   - **Always Use HTTPS**: On
   - **Automatic HTTPS Rewrites**: On
   - **Minimum TLS Version**: TLS 1.2

4. Go to **Edge Certificates**
5. Enable:
   - **Always Use HTTPS**: On
   - **HTTP Strict Transport Security (HSTS)**: Enable with max-age 1 year

### 6.4 Verify Domain

1. Visit `https://friendsmediahouse.com` (Main website)
2. Check SSL certificate (should show valid)
3. Test `https://www.friendsmediahouse.com` (should redirect to main)
4. Test `https://admin.friendsmediahouse.com` (Admin panel)
5. Test Media CDN: `https://media.friendsmediahouse.com/test-image.jpg`

---

## 7. Routing Configuration

### 7.1 Application Routes

The Next.js App Router handles all routing. Here's the complete route structure:

#### Public Routes (friendsmediahouse.com)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing page with hero, featured events, services, FAQ |
| `/gallery` | Gallery | Browse all events/galleries with filters |
| `/events/[slug]` | Event Detail | Individual event with photos and videos |
| `/about` | About Us | Company info, team, stats, timeline |
| `/reviews` | Reviews | Client testimonials |
| `/contact` | Contact | Contact form with lead capture |

#### Admin Routes (admin.friendsmediahouse.com)

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | Dashboard | Overview stats, recent activity |
| `/admin/login` | Login | Admin authentication |
| `/admin/add-event` | Add Event | Create new event |
| `/admin/events` | Events | Manage all events |
| `/admin/upload` | Upload | Bulk photo upload |
| `/admin/galleries` | Galleries | Manage galleries |
| `/admin/leads` | Leads | Contact form submissions |
| `/admin/reviews` | Reviews | Manage testimonials |
| `/admin/faqs` | FAQs | Manage Q&A |
| `/admin/comments` | Comments | Moderate photo comments |
| `/admin/settings` | Settings | Site configuration |

#### API Routes (15 Total)

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/events/featured` | GET | ❌ | Get featured events |
| `/api/galleries/[id]/photos` | GET | ❌ | Get paginated event photos |
| `/api/contact` | POST | ❌ | Submit contact form |
| `/api/videos` | POST, DELETE | ❌ | Add/remove videos |
| `/api/download-image` | GET | ❌ | Proxy image downloads |
| `/api/test-db` | GET | ❌ | Debug database connectivity |
| `/api/upload` | POST | ✅* | Upload image with optimization |
| `/api/upload/public` | POST | ❌ | Upload public assets |
| `/api/upload/video` | POST | ✅* | Upload video (max 500MB) |
| `/api/upload/delete` | POST | ✅* | Delete file from R2 |
| `/api/auth/login` | POST | ❌ | Admin authentication |
| `/api/auth/change-password` | POST | ✅ | Change admin password |
| `/api/admin/events` | GET, POST | ✅ | List/Create events |
| `/api/admin/events/[id]` | GET, PUT, DELETE | ✅ | CRUD single event |
| `/api/admin/leads` | GET, PATCH | ✅ | Manage leads |

*Can be disabled via `UPLOAD_DISABLE_AUTH=true`

### 7.2 Middleware Configuration

The `middleware.ts` file handles route protection and subdomain routing:

```typescript
// middleware.ts - Key functionality
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  
  // Handle admin subdomain
  if (hostname.startsWith('admin.')) {
    // Redirect to /admin routes
    if (!pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL(`/admin${pathname}`, request.url));
    }
  }
  
  // Protect admin routes
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    // Check authentication
    const token = request.cookies.get('admin-token');
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 7.3 Configure Subdomain Routing in Vercel

1. Go to Vercel project → **Settings** → **Domains**

2. Add domains with proper configuration:
   ```
   friendsmediahouse.com → / (root)
   www.friendsmediahouse.com → redirects to friendsmediahouse.com
   admin.friendsmediahouse.com → /admin
   ```

3. For subdomain routing, update `vercel.json`:
   ```json
   {
     "rewrites": [
       {
         "source": "/:path*",
         "has": [
           {
             "type": "host",
             "value": "admin.friendsmediahouse.com"
           }
         ],
         "destination": "/admin/:path*"
       }
     ],
     "redirects": [
       {
         "source": "/:path*",
         "has": [
           {
             "type": "host",
             "value": "www.friendsmediahouse.com"
           }
         ],
         "destination": "https://friendsmediahouse.com/:path*",
         "permanent": true
       }
     ]
   }
   ```

### 7.4 Route Protection

Protected routes require authentication:

- All `/admin/*` routes (except `/admin/login`)
- All `/api/admin/*` API routes
- Upload routes: `/api/upload`, `/api/upload/delete`

### 7.5 Static Assets

| Path | Domain | Description |
|------|--------|-------------|
| `/images/*` | media.friendsmediahouse.com | Event photos, gallery images |
| `/banners/*` | media.friendsmediahouse.com | Homepage banners |
| `/logos/*` | media.friendsmediahouse.com | Site logos |
| `/videos/*` | media.friendsmediahouse.com | Uploaded videos |
| `/public/*` | friendsmediahouse.com | Static assets (favicon, manifest) |

---

## 8. Environment Variables

Create `.env.local` file in the project root directory with the following variables:

### Complete Environment Configuration

```env
# ==================================================
# SUPABASE CONFIGURATION
# ==================================================
# Get from: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://fnnlvnofuwogukgvfgpx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubmx2bm9mdXdvZ3VrZ3ZmZ3B4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzU1OTQsImV4cCI6MjA4MzAxMTU5NH0.hSNwTbktECJ1-UvJKVUOG1VcU-OAe8DOwVcwaK7y9ZY
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ==================================================
# CLOUDFLARE R2 STORAGE
# ==================================================
# Get from: Cloudflare Dashboard → R2 → Manage R2 API Tokens
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=friends-media-house
R2_PUBLIC_URL=https://media.friendsmediahouse.com

# ==================================================
# RESEND EMAIL SERVICE
# ==================================================
# Get from: Resend Dashboard → API Keys
RESEND_API_KEY=re_your_resend_api_key
ADMIN_EMAIL=admin@friendsmediahouse.com
CONTACT_EMAIL=contact@friendsmediahouse.com

# ==================================================
# APPLICATION CONFIGURATION
# ==================================================
NEXT_PUBLIC_APP_URL=https://friendsmediahouse.com
NODE_ENV=production

# ==================================================
# OPTIONAL: ANALYTICS & MONITORING
# ==================================================
# NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
# SENTRY_DSN=your-sentry-dsn
```

### 8.1 Add to Vercel

1. Go to Vercel project → **Settings** → **Environment Variables**
2. Add each variable from above:
   - Select environment: Production, Preview, Development
   - Paste name and value
   - Click "Save"

3. After adding all variables, redeploy:
   - Go to **Deployments**
   - Click "Redeploy" on latest deployment

---

## 9. Post-Deployment Checklist

### ✅ Supabase
- [ ] Database schema applied
- [ ] RLS policies active
- [ ] Admin user created
- [ ] API keys added to Vercel

### ✅ Cloudflare R2
- [ ] Bucket created
- [ ] Public access enabled
- [ ] API token generated
- [ ] Custom domain connected (media.friendsmediahouse.com)

### ✅ Resend
- [ ] Domain verified
- [ ] DNS records configured
- [ ] API key generated
- [ ] Test email sent successfully

### ✅ Vercel
- [ ] Repository connected
- [ ] Environment variables configured
- [ ] Production deployment successful
- [ ] Functions working (test API routes)

### ✅ Domain
- [ ] DNS records configured in Cloudflare
- [ ] SSL certificate active
- [ ] Main site accessible (friendsmediahouse.com)
- [ ] WWW redirect working
- [ ] Admin panel accessible (admin.friendsmediahouse.com)
- [ ] Media CDN working (media.friendsmediahouse.com)

### ✅ Testing
- [ ] Homepage loads correctly
- [ ] Admin login works
- [ ] Image upload to R2 works
- [ ] Contact form sends emails
- [ ] Events display properly
- [ ] Gallery loads images from CDN

---

## 10. Troubleshooting

### Issue: Images not loading from R2

**Solution:**
1. Check R2 public access is enabled
2. Verify `R2_PUBLIC_URL` is set to `https://media.friendsmediahouse.com`
3. Check CORS policy on R2 bucket
4. Ensure media subdomain DNS is propagated
5. Test direct URL: `https://media.friendsmediahouse.com/banners/test.jpg`

### Issue: Contact form not sending emails

**Solution:**
1. Verify Resend API key is correct
2. Check domain is verified in Resend
3. Verify DNS records (SPF, DKIM, DMARC)
4. Check Resend dashboard for failed emails

### Issue: Database queries failing

**Solution:**
1. Check Supabase API keys are correct
2. Verify RLS policies allow the operation
3. Check if admin user is authenticated
4. Review Supabase logs for errors

### Issue: Build failing on Vercel

**Solution:**
1. Check build logs for specific error
2. Verify all environment variables are set
3. Ensure Node version is 20.x
4. Check for TypeScript errors locally

---

## 11. Maintenance

### Regular Tasks

**Weekly:**
- Monitor Supabase database size (free tier: 500MB)
- Check R2 storage usage
- Review Resend email delivery reports

**Monthly:**
- Backup Supabase database
- Review and clean up old leads
- Update dependencies (`npm update`)
- Check for security updates

**Quarterly:**
- Review and optimize images (compress large files)
- Analyze CDN cache hit rates
- Review RLS policies
- Update documentation

---

## 12. Service Quotas & Limits

### Supabase (Free Tier)
- Database Size: 500 MB
- Storage: 1 GB
- Bandwidth: 2 GB/month
- API Requests: 50,000/month

### Cloudflare R2
- Storage: 10 GB/month (free)
- Class A Operations: 1M/month (free)
- Class B Operations: 10M/month (free)
- Egress: Free

### Resend (Free Tier)
- Emails: 3,000/month
- Domains: 1
- Daily limit: 100 emails/day

### Vercel (Hobby Plan)
- Bandwidth: 100 GB/month
- Serverless Function Execution: 100 GB-hours
- Build time: 6,000 minutes/month

---

## 13. Support & Resources

### Documentation
- **Supabase**: https://supabase.com/docs
- **Cloudflare R2**: https://developers.cloudflare.com/r2/
- **Resend**: https://resend.com/docs
- **Vercel**: https://vercel.com/docs
- **Next.js**: https://nextjs.org/docs

### Community
- Supabase Discord: https://discord.supabase.com
- Cloudflare Community: https://community.cloudflare.com
- Vercel Community: https://github.com/vercel/vercel/discussions

---

## Additional Notes

### Security Best Practices
1. **Never commit** `.env.local` to version control
2. Use **different credentials** for development and production
3. Rotate API keys every **90 days**
4. Enable **2FA** on all service accounts
5. Use **strong passwords** (minimum 16 characters)
6. Store sensitive keys in **Vercel Environment Variables**

### Performance Optimization
1. Enable **Vercel Edge Functions** for faster API responses
2. Configure **Cloudflare Page Rules** for caching:
   - Cache HTML: 4 hours
   - Cache static assets: 1 year
3. Use **Next.js Image Optimization** for all images
4. Enable **Sharp** for server-side image processing
5. Implement **lazy loading** for images below fold

### Cost Management
- **Supabase Free Tier**: 500MB database, 1GB storage
- **R2**: First 10GB free, then $0.015/GB
- **Resend**: 3,000 emails/month free
- **Vercel Hobby**: Free for personal projects

### Monitoring Setup
1. **Supabase**: Enable database metrics in dashboard
2. **Vercel**: Check Analytics and Real-time logs
3. **Resend**: Monitor email delivery in dashboard
4. **R2**: Track storage usage in Cloudflare dashboard

---

## 14. Additional Configuration Notes

### Security Best Practices

1. **Environment Variables**
   - Never commit `.env.local` to version control
   - Add `.env*.local` to `.gitignore`
   - Use different credentials for dev/staging/production

2. **API Keys**
   - Rotate keys every 90 days
   - Use minimum required permissions
   - Store service role keys only on server

3. **Authentication**
   - Enable 2FA on all service accounts
   - Use strong passwords (16+ characters)
   - Implement rate limiting on login endpoints

4. **Database**
   - Keep RLS policies strict
   - Never expose service role key to client
   - Regular backups (daily recommended)

### Performance Optimization

1. **Image Optimization**
   - Use Next.js Image component everywhere
   - Sharp processes images server-side
   - WebP format (85% quality for originals, 70% for thumbnails)
   - Generate blur placeholders (LQIP) for better UX

2. **Caching Strategy**
   - Static assets: `max-age=31536000, immutable`
   - API responses: Short TTL (5-10 minutes)
   - CDN edge caching via Cloudflare

3. **Code Optimization**
   - Use Turbopack for faster builds
   - Dynamic imports for large components
   - Route-based code splitting (automatic with App Router)

### Monitoring Setup

1. **Supabase Metrics**
   - Database size and connection pool usage
   - Query performance (slow queries)
   - Storage bandwidth
   - API request counts

2. **Vercel Analytics**
   - Page load times
   - Function execution duration
   - Error rates by route
   - Geographic distribution

3. **R2 Storage Monitoring**
   - Storage usage (GB)
   - Request counts (Class A/B operations)
   - Bandwidth usage
   - Set up billing alerts at 80% quota

4. **Email Delivery (Resend)**
   - Delivery rate
   - Bounce rate
   - Open rates (if tracking enabled)
   - Failed sends and reasons

### Cost Management

| Service | Free Tier | Paid Starts At |
|---------|-----------|----------------|
| Supabase | 500MB DB + 1GB storage | $25/month (Pro) |
| Cloudflare R2 | 10GB storage, 1M Class A ops | $0.015/GB storage |
| Resend | 3,000 emails/month, 100/day | $20/month (10k emails) |
| Vercel | 100GB bandwidth, 6k build min | $20/month (Pro) |

**Monthly Cost Estimate** (assuming 1,000 users/month):
- Supabase: Free (under limits)
- R2: ~$0.50 (30GB storage)
- Resend: Free (under 3k emails)
- Vercel: Free (under limits)
**Total: ~$0.50/month** 🎉

### Backup Strategy

1. **Database Backup** (Weekly)
```bash
# Using Supabase CLI
supabase db dump -f backup-$(date +%Y%m%d).sql
```

2. **R2 Storage Backup** (Monthly)
   - Use rclone or AWS CLI to sync to backup bucket
   - Keep 3 months of backups

3. **Configuration Backup**
   - Export environment variables (encrypted)
   - Document DNS records
   - Save vercel.json and middleware.ts

---

**Last Updated**: January 5, 2026  
**Configuration Version**: 1.0  
**Covers**: Complete setup for Supabase, R2, Resend, Vercel with domain configuration, routing, security, monitoring, and cost optimization

