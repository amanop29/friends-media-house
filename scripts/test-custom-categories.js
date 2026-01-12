/**
 * Test script to verify custom_category migration
 * Run with: node scripts/test-custom-categories.js
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
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.log('Found vars:', Object.keys(envVars));
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseKey ? '[REDACTED]' : 'undefined');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCustomCategories() {
  console.log('🔍 Testing custom_category migration...\n');

  try {
    // Test 1: Query all events and check custom_category
    console.log('Test 1: Checking if custom_category column exists...');
    const { data: events, error: queryError } = await supabase
      .from('events')
      .select('id, title, category, custom_category')
      .order('created_at', { ascending: false })
      .limit(10);

    if (queryError) {
      console.error('❌ Error querying events:', queryError.message);
      
      if (queryError.message.includes('custom_category')) {
        console.log('\n💡 The custom_category column does NOT exist!');
        console.log('\n📋 You need to run this migration in Supabase SQL Editor:');
        console.log('─'.repeat(80));
        console.log(`
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS custom_category VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_events_custom_category ON events(custom_category);

COMMENT ON COLUMN events.custom_category IS 'Stores custom category names that override the category enum when present. If NULL, use the category field.';
        `);
        console.log('─'.repeat(80));
        console.log('\n🔗 Go to: https://supabase.com/dashboard → Your Project → SQL Editor\n');
      }
      process.exit(1);
    }

    console.log(`✅ Column exists! Found ${events.length} events\n`);

    // Display events with their categories
    console.log('📋 Events Category Breakdown:');
    console.log('─'.repeat(80));
    console.log('Title'.padEnd(20), 'Category'.padEnd(15), 'Custom Category'.padEnd(20), 'Display As');
    console.log('─'.repeat(80));

    events.forEach(event => {
      const displayCategory = event.custom_category || event.category;
      const title = (event.title || 'Untitled').substring(0, 18).padEnd(20);
      const category = (event.category || 'N/A').padEnd(15);
      const customCat = (event.custom_category || 'NULL').padEnd(20);
      console.log(title, category, customCat, displayCategory);
    });

    // Test 2: Check for "other" category events that should have custom_category
    console.log('\n\nTest 2: Events with category="other" (should have custom_category):');
    const otherEvents = events.filter(e => e.category === 'other');
    
    if (otherEvents.length === 0) {
      console.log('✅ No events with category="other"');
    } else {
      otherEvents.forEach(event => {
        if (event.custom_category) {
          console.log(`✅ "${event.title}" - Has custom_category: "${event.custom_category}"`);
        } else {
          console.log(`⚠️  "${event.title}" - Missing custom_category (needs to be re-saved)`);
        }
      });
    }

    // Test 3: Summary
    console.log('\n\n📊 Summary:');
    const standardCategories = events.filter(e => e.category !== 'other' && !e.custom_category);
    const customCategories = events.filter(e => e.custom_category);
    const needsUpdate = events.filter(e => e.category === 'other' && !e.custom_category);

    console.log(`✅ Standard categories: ${standardCategories.length}`);
    console.log(`✅ Custom categories: ${customCategories.length}`);
    
    if (needsUpdate.length > 0) {
      console.log(`⚠️  Events needing custom_category: ${needsUpdate.length}`);
      console.log('\n💡 Solution: Edit these events in admin panel and save again to populate custom_category:');
      needsUpdate.forEach(e => console.log(`   - "${e.title}"`));
    }

    // Test 4: Check the "you" event specifically
    console.log('\n\nTest 3: Looking for the "you" event...');
    const youEvent = events.find(e => e.title.toLowerCase().includes('you'));
    
    if (youEvent) {
      console.log(`✅ Found event: "${youEvent.title}"`);
      console.log(`   Category (enum): ${youEvent.category}`);
      console.log(`   Custom Category: ${youEvent.custom_category || 'NULL'}`);
      
      if (youEvent.custom_category) {
        console.log(`   ✅ Will display as: "${youEvent.custom_category}"`);
      } else if (youEvent.category === 'other') {
        console.log(`   ⚠️  Currently displays as: "other"`);
        console.log(`   💡 Action needed: Edit this event in admin panel, select "you" category, and save`);
        console.log(`      This will populate the custom_category field with "you"`);
      } else {
        console.log(`   ✅ Will display as: "${youEvent.category}"`);
      }
    } else {
      console.log('⚠️  "you" event not found in recent 10 events');
    }

    console.log('\n✅ Migration test complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure you have run the migration SQL in Supabase Dashboard!');
    process.exit(1);
  }
}

// Run the test
testCustomCategories();
