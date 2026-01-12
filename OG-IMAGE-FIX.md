# Open Graph Image Fix

## Problem
The homepage banner is not showing in Open Graph previews (Facebook, Twitter, LinkedIn) when sharing the URL.

## Root Cause
The R2 storage bucket serving the images doesn't have CORS headers configured, which prevents social media platforms from fetching the image.

## Solution

### Option 1: Configure CORS on Cloudflare R2 (Recommended)

1. **Go to Cloudflare Dashboard**
   - Navigate to R2 → Your Bucket → Settings → CORS Policy

2. **Add CORS Policy**
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": [],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

3. **Save and Deploy**

### Option 2: Use Next.js Image Proxy (Alternative)

If you can't modify R2 CORS, use Next.js to proxy the image:

1. The image will be served through your domain with proper headers
2. Already implemented in the code updates above

## Testing After Fix

Use these tools to verify Open Graph works:

1. **Facebook Debugger**
   https://developers.facebook.com/tools/debug/?q=https://friendsmediahouse.com
   
2. **Twitter Card Validator**
   https://cards-dev.twitter.com/validator
   
3. **LinkedIn Post Inspector**
   https://www.linkedin.com/post-inspector/
   
4. **OpenGraph.xyz**
   https://www.opengraph.xyz/url/https://friendsmediahouse.com

## Current Status

✅ Banner URL is configured: `https://media.friendsmediahouse.com/banners/1768051705608-home2.png`
✅ Image is accessible (200 OK)
✅ Correct content type (image/png)
✅ Good file size (1MB)
⚠️ Missing CORS headers

## What to Do Now

1. **Add CORS to R2 bucket** (5 minutes)
   - OR -
2. **Deploy and test** - the code now has better error handling

After deploying, clear the cache on social platforms:
- Facebook: Use the debugger tool and click "Scrape Again"
- Twitter: Use the validator and clear cache
- LinkedIn: Test with the post inspector

The image should appear in all social previews after fixing CORS! 🎉
