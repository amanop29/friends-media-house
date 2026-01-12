/**
 * Diagnostic script for Open Graph image setup
 * Run with: node scripts/check-og-image.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const appUrl = envVars.NEXT_PUBLIC_APP_URL || 'https://friendsmediahouse.com';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOGImage() {
  console.log('🔍 Checking Open Graph Image Setup...\n');

  try {
    // Step 1: Check Supabase settings
    console.log('Step 1: Fetching banner URL from Supabase...');
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'site_config')
      .single();

    if (error) {
      console.error('❌ Error fetching settings:', error.message);
      console.log('\n💡 Make sure the settings table exists and has a site_config row');
      return;
    }

    const settings = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    const bannerUrl = settings?.homeBannerUrl;

    if (!bannerUrl) {
      console.error('❌ No homeBannerUrl found in settings');
      console.log('\n💡 Upload a banner image in Admin → Settings → Site Configuration');
      return;
    }

    console.log('✅ Found banner URL:', bannerUrl);

    // Step 2: Check if URL is absolute
    console.log('\nStep 2: Checking URL format...');
    const isAbsolute = bannerUrl.startsWith('http');
    
    if (isAbsolute) {
      console.log('✅ URL is absolute:', bannerUrl);
    } else {
      const absoluteUrl = `${appUrl}${bannerUrl.startsWith('/') ? '' : '/'}${bannerUrl}`;
      console.log('⚠️  URL is relative:', bannerUrl);
      console.log('   Will be converted to:', absoluteUrl);
    }

    // Step 3: Test image accessibility
    console.log('\nStep 3: Testing image accessibility...');
    const testUrl = isAbsolute ? bannerUrl : `${appUrl}${bannerUrl.startsWith('/') ? '' : '/'}${bannerUrl}`;
    
    try {
      const response = await fetch(testUrl, { method: 'HEAD' });
      
      if (response.ok) {
        console.log('✅ Image is accessible');
        console.log('   Status:', response.status);
        console.log('   Content-Type:', response.headers.get('content-type'));
        console.log('   Content-Length:', response.headers.get('content-length'));
        
        // Check CORS headers
        const corsHeader = response.headers.get('access-control-allow-origin');
        if (corsHeader) {
          console.log('   CORS:', corsHeader);
        } else {
          console.log('   ⚠️  No CORS headers (might affect some social platforms)');
        }
      } else {
        console.error('❌ Image not accessible');
        console.log('   Status:', response.status);
        console.log('   Status Text:', response.statusText);
      }
    } catch (fetchError) {
      console.error('❌ Failed to fetch image:', fetchError.message);
      console.log('   URL:', testUrl);
    }

    // Step 4: Check environment variables
    console.log('\nStep 4: Checking environment variables...');
    console.log('✅ NEXT_PUBLIC_APP_URL:', appUrl);
    console.log('✅ NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');

    // Step 5: Generate test URLs for social platforms
    console.log('\nStep 5: Test URLs for social platforms:');
    console.log('─'.repeat(80));
    
    const encodedUrl = encodeURIComponent(appUrl);
    console.log('\n📱 Facebook Debugger:');
    console.log(`   https://developers.facebook.com/tools/debug/?q=${encodedUrl}`);
    
    console.log('\n🐦 Twitter Card Validator:');
    console.log(`   https://cards-dev.twitter.com/validator`);
    
    console.log('\n🔗 LinkedIn Post Inspector:');
    console.log(`   https://www.linkedin.com/post-inspector/`);
    
    console.log('\n🌐 OpenGraph.xyz:');
    console.log(`   https://www.opengraph.xyz/url/${encodedUrl}`);

    // Step 6: Summary and recommendations
    console.log('\n\n📊 Summary and Recommendations:');
    console.log('─'.repeat(80));
    
    if (isAbsolute && bannerUrl.startsWith('https')) {
      console.log('✅ Banner URL is properly configured');
    } else if (!isAbsolute) {
      console.log('⚠️  Banner URL is relative - ensure NEXT_PUBLIC_APP_URL is set correctly');
      console.log('   Current: ' + appUrl);
    } else if (bannerUrl.startsWith('http://')) {
      console.log('⚠️  Banner uses HTTP (not HTTPS) - some platforms may not display it');
    }

    console.log('\n💡 Tips for better Open Graph images:');
    console.log('   - Recommended size: 1200x630 pixels');
    console.log('   - Format: JPG or PNG');
    console.log('   - File size: Under 5MB');
    console.log('   - Use absolute HTTPS URLs');
    console.log('   - Test on multiple platforms after deployment');
    
    console.log('\n✅ Diagnostic complete!\n');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

checkOGImage();
