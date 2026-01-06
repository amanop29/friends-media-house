# Domain Configuration Guide - Friends Media House

Complete guide for setting up subdomain routing for production deployment.

---

## 🎯 Domain Structure

### Production Domains
- **Main Site:** `friendsmediahouse.com` (public-facing website)
- **Admin Panel:** `admin.friendsmediahouse.com` (admin dashboard)

### How It Works
```
friendsmediahouse.com              → Home, Gallery, Events, Contact, Reviews
  ├── /                            → Homepage
  ├── /about                       → About Us
  ├── /gallery                     → Photo Gallery
  ├── /events/[slug]               → Event Details
  ├── /contact                     → Contact Form
  └── /reviews                     → Reviews

admin.friendsmediahouse.com        → Admin Dashboard
  ├── /admin/login                 → Admin Login
  ├── /admin                       → Dashboard
  ├── /admin/galleries             → Manage Galleries
  ├── /admin/upload                → Upload Media
  ├── /admin/events/new            → Create Event
  ├── /admin/leads                 → Lead Management
  ├── /admin/reviews               → Review Management
  ├── /admin/comments              → Comment Moderation
  ├── /admin/faqs                  → FAQ Management
  ├── /admin/team                  → Team Management
  └── /admin/settings              → Settings
```

---

## ✅ Current Configuration Status

### Middleware Routing (middleware.ts)
✅ **Properly Configured**

The middleware handles automatic subdomain routing:

1. **Admin Routes Protection:**
   - Any attempt to access `/admin/*` from `friendsmediahouse.com` 
   - **Automatically redirects** to `admin.friendsmediahouse.com/admin/*`

2. **Public Routes Protection:**
   - Any attempt to access public routes (e.g., `/gallery`) from `admin.friendsmediahouse.com`
   - **Automatically redirects** to `friendsmediahouse.com/gallery`

3. **Localhost Exception:**
   - During development, both domains work from `localhost:3000`
   - No redirects on localhost for easier testing

### Key Features
- ✅ 308 Permanent Redirects (SEO-friendly)
- ✅ Works with custom domains AND Vercel preview URLs
- ✅ Excludes API routes from redirects
- ✅ Excludes static files from processing
- ✅ Security headers included

---

## 🚀 Vercel Setup Instructions

### Step 1: Deploy Your Project

1. Import your repository to Vercel
2. Deploy with all environment variables
3. Your site will be available at `friends-media-house.vercel.app`

### Step 2: Add Main Domain

1. Go to **Project Settings → Domains**
2. Click **Add Domain**
3. Enter: `friendsmediahouse.com`
4. Vercel will provide DNS configuration

### Step 3: Add Admin Subdomain

1. In the same **Domains** section
2. Click **Add Domain** again
3. Enter: `admin.friendsmediahouse.com`
4. Vercel will provide DNS configuration for subdomain

### Step 4: Configure DNS

You have two options for DNS configuration:

#### Option A: Vercel Nameservers (Recommended ⭐)

**Advantages:**
- Automatic SSL
- Instant propagation
- Vercel manages everything
- No manual DNS record updates needed

**Steps:**
1. Vercel provides nameservers like:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
2. Go to your domain registrar (Hostinger/GoDaddy/etc.)
3. Find **Nameserver Settings**
4. Replace existing nameservers with Vercel's
5. Save changes
6. Wait 5 minutes - 48 hours for propagation

#### Option B: Manual DNS Records

**Use if you want to keep your current DNS provider**

Add these records in your DNS provider:

**For Main Domain (friendsmediahouse.com):**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**For Admin Subdomain (admin.friendsmediahouse.com):**
```
Type: CNAME
Name: admin
Value: cname.vercel-dns.com
TTL: 3600
```

### Step 5: Verify Configuration

After DNS propagation (usually 5-30 minutes):

1. **Test Main Domain:**
   - Visit `https://friendsmediahouse.com`
   - Should show homepage ✅
   - Try accessing `https://friendsmediahouse.com/admin`
   - Should redirect to `https://admin.friendsmediahouse.com/admin` ✅

2. **Test Admin Subdomain:**
   - Visit `https://admin.friendsmediahouse.com`
   - Should redirect to `https://friendsmediahouse.com` ✅
   - Visit `https://admin.friendsmediahouse.com/admin/login`
   - Should show admin login page ✅

3. **Test Public Routes:**
   - Visit `https://admin.friendsmediahouse.com/gallery`
   - Should redirect to `https://friendsmediahouse.com/gallery` ✅

---

## 🔧 Technical Implementation

### How the Routing Works

#### 1. Middleware Layer (middleware.ts)
```typescript
// Runs on EVERY request before the page loads
export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;
  
  // Check if admin subdomain
  const isAdminSubdomain = hostname.startsWith('admin.');
  
  // RULE 1: Admin routes only on admin subdomain
  if (pathname.startsWith('/admin') && !isAdminSubdomain) {
    // Redirect: friendsmediahouse.com/admin → admin.friendsmediahouse.com/admin
    return NextResponse.redirect(new URL(`https://admin.${hostname}${pathname}`));
  }
  
  // RULE 2: Public routes only on main domain
  if (!pathname.startsWith('/admin') && isAdminSubdomain) {
    // Redirect: admin.friendsmediahouse.com/gallery → friendsmediahouse.com/gallery
    return NextResponse.redirect(new URL(`https://${hostname.replace('admin.', '')}${pathname}`));
  }
}
```

#### 2. API Routes
API routes are accessible from **both domains**:
- `friendsmediahouse.com/api/contact` ✅
- `admin.friendsmediahouse.com/api/admin/events` ✅

This is intentional for:
- Frontend making API calls
- Admin panel making API calls
- No CORS issues

#### 3. Environment Variables
Both domains share the same deployment, so environment variables are consistent:
```env
NEXT_PUBLIC_APP_URL=https://friendsmediahouse.com
NEXT_PUBLIC_ADMIN_URL=https://admin.friendsmediahouse.com
```

---

## 🧪 Testing Checklist

### Before Going Live
- [ ] Main domain points to Vercel
- [ ] Admin subdomain points to Vercel
- [ ] SSL certificates issued (automatic)
- [ ] DNS propagation complete

### After Going Live

#### Main Domain Tests (friendsmediahouse.com)
- [ ] Homepage loads: `https://friendsmediahouse.com`
- [ ] Gallery works: `https://friendsmediahouse.com/gallery`
- [ ] Event pages work: `https://friendsmediahouse.com/events/[slug]`
- [ ] Contact form works: `https://friendsmediahouse.com/contact`
- [ ] Admin redirect works: `https://friendsmediahouse.com/admin` → redirects to admin subdomain

#### Admin Subdomain Tests (admin.friendsmediahouse.com)
- [ ] Admin login loads: `https://admin.friendsmediahouse.com/admin/login`
- [ ] Dashboard loads: `https://admin.friendsmediahouse.com/admin`
- [ ] Upload works: `https://admin.friendsmediahouse.com/admin/upload`
- [ ] All admin pages accessible
- [ ] Public route redirect: `https://admin.friendsmediahouse.com/gallery` → redirects to main domain

#### Cross-Domain Tests
- [ ] Login on admin subdomain maintains session
- [ ] API calls work from frontend
- [ ] API calls work from admin panel
- [ ] Images load on both domains
- [ ] No CORS errors in console

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Too Many Redirects" Error

**Cause:** Redirect loop between domains

**Solution:**
1. Clear browser cache and cookies
2. Check middleware logic in `middleware.ts`
3. Verify DNS is pointing to Vercel, not other hosting
4. Check for conflicting rewrites in `vercel.json`

### Issue 2: Admin Panel Shows 404

**Cause:** DNS not configured for subdomain

**Solution:**
1. Verify `admin.friendsmediahouse.com` is added in Vercel Domains
2. Check DNS records for subdomain CNAME
3. Wait for DNS propagation (up to 48 hours)
4. Use `dig admin.friendsmediahouse.com` to verify DNS

### Issue 3: SSL Certificate Error

**Cause:** SSL not issued for subdomain

**Solution:**
1. Wait 5-10 minutes after DNS propagation
2. Vercel automatically provisions SSL
3. Check Vercel dashboard for SSL status
4. If stuck, remove and re-add domain

### Issue 4: Images Not Loading on Admin Subdomain

**Cause:** Image URLs pointing to wrong domain

**Solution:**
1. Verify `next.config.mjs` has correct image domains
2. Check R2_PUBLIC_URL in environment variables
3. Ensure R2 bucket is publicly accessible
4. Check browser console for CORS errors

### Issue 5: API Calls Failing

**Cause:** CORS or incorrect API URLs

**Solution:**
1. API routes work from both domains (no CORS needed)
2. Check environment variables are set in Vercel
3. Verify API route files exist in `/app/api/`
4. Check Vercel Function Logs for errors

---

## 🔒 Security Considerations

### Headers Applied (in middleware.ts)
```typescript
X-Frame-Options: DENY              // Prevent clickjacking
X-Content-Type-Options: nosniff    // Prevent MIME sniffing
Referrer-Policy: strict-origin     // Control referrer information
Permissions-Policy: camera=()...   // Disable unnecessary browser features
```

### Admin Protection
- Admin routes **only** accessible via `admin.friendsmediahouse.com`
- Automatic redirect prevents accidental public access
- Authentication required for all admin pages

### HTTPS Enforcement
- Vercel automatically enforces HTTPS
- HTTP requests auto-redirect to HTTPS
- SSL certificates auto-renewed

---

## 📊 DNS Propagation Check

### How to Check DNS Status

**Using Online Tools:**
1. Visit: https://dnschecker.org
2. Enter: `friendsmediahouse.com`
3. Check global DNS propagation status

**Using Command Line:**
```bash
# Check main domain
dig friendsmediahouse.com

# Check admin subdomain
dig admin.friendsmediahouse.com

# Check nameservers
dig friendsmediahouse.com NS
```

**Expected Results:**
- Main domain should point to Vercel IP: `76.76.21.21` or `cname.vercel-dns.com`
- Admin subdomain should point to: `cname.vercel-dns.com`

---

## 🎨 Customization

### Adding More Subdomains

If you want to add more subdomains (e.g., `blog.friendsmediahouse.com`):

1. **Add in Vercel:**
   - Go to Domains → Add Domain
   - Enter: `blog.friendsmediahouse.com`

2. **Update Middleware:**
   - Add logic to handle blog subdomain
   - Define which routes belong to blog

3. **Configure DNS:**
   - Add CNAME record: `blog` → `cname.vercel-dns.com`

### Changing Domain Names

If you want to use a different domain:

1. **Update Environment Variables:**
   ```env
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   NEXT_PUBLIC_ADMIN_URL=https://admin.yourdomain.com
   ```

2. **Update vercel.json:**
   - Change domain references in `env` section

3. **Add Domains in Vercel:**
   - Add both main and admin subdomain
   - Configure DNS as described above

---

## 📋 Deployment Checklist

### Pre-Deployment
- [x] Middleware configured for subdomain routing
- [x] vercel.json cleaned up (no conflicting rewrites)
- [x] Environment variables include domain URLs
- [ ] Domain purchased and ready

### During Deployment
- [ ] Main domain added to Vercel
- [ ] Admin subdomain added to Vercel
- [ ] DNS records configured (nameservers or CNAME)
- [ ] Waiting for DNS propagation

### Post-Deployment
- [ ] Test main domain loads
- [ ] Test admin subdomain loads
- [ ] Test redirects work correctly
- [ ] Verify SSL certificates active
- [ ] Test all admin features
- [ ] Test all public features
- [ ] Check console for errors

---

## 📞 Quick Reference

### Domain Access
| Purpose | URL | Notes |
|---------|-----|-------|
| Homepage | `https://friendsmediahouse.com` | Public site |
| Gallery | `https://friendsmediahouse.com/gallery` | Public site |
| Events | `https://friendsmediahouse.com/events/[slug]` | Public site |
| Admin Login | `https://admin.friendsmediahouse.com/admin/login` | Admin only |
| Dashboard | `https://admin.friendsmediahouse.com/admin` | Admin only |
| Upload | `https://admin.friendsmediahouse.com/admin/upload` | Admin only |

### DNS Configuration
| Record Type | Name | Value | TTL |
|-------------|------|-------|-----|
| A | @ | 76.76.21.21 | 3600 |
| CNAME | www | cname.vercel-dns.com | 3600 |
| CNAME | admin | cname.vercel-dns.com | 3600 |

### Support
- **Vercel Docs:** https://vercel.com/docs/concepts/projects/domains
- **DNS Help:** https://vercel.com/docs/concepts/projects/domains/troubleshooting

---

## ✅ Summary

Your domain configuration is **production-ready**! Here's what's set up:

✅ **Automatic Routing:** Middleware handles all subdomain logic  
✅ **Clean URLs:** No manual configuration needed in code  
✅ **Security:** Headers and HTTPS enforced  
✅ **SEO-Friendly:** 308 permanent redirects  
✅ **Development-Friendly:** Works on localhost without issues  

**Next Step:** Add your domains in Vercel and configure DNS! 🚀

---

**Last Updated:** January 6, 2026  
**Configuration Version:** 1.0.0
