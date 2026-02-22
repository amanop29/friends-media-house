# Launching Soon Page - Setup Instructions

## Overview
A clean, minimal "Launching Soon" page with **two separate bento boxes**:
- 📦 **Two independent rounded boxes** side-by-side
- 🎨 **Beautiful gradient background** with gold accents
- 🖼️ **Camera/lens photography** image
- 🎭 **Large logo centered above** - no box, clean display
- ⏱️ **Simple countdown display** with clean numbers
- 🌓 **Dark/Light mode support** built-in
- 📧 **Inline email form** - no separate cards
- 🎯 **Gap between boxes** - modern bento grid style
- ✨ **Subtle animations** - fade-in only

## Design Philosophy

This page follows a **modern bento grid** layout pattern:
- **Centered logo** - Large, clean logo above everything
- **Two separate boxes** - Image box + Content box with gap
- **Grid layout** - 50/50 split on desktop, stacked on mobile
- **Gradient background** - Gold radial gradients on light/dark base
- **No complexity** - Simple numbers, no nested elements
- **Typography-focused** - Large, bold "COMING SOON" text
- **Minimal effects** - Clean, professional, fast-loading

## File Structure

```
app/launch/page.tsx                 # Main launch page (self-contained)
src/lib/settings.ts                  # Settings management (already exists)
src/styles/globals.css               # Global animations
```

## Configuration

### 1. Set Launch Date

Edit `app/launch/page.tsx` and modify the `launchDate` constant (around line 18):

```typescript
// Set your launch date here (Year, Month-1, Day, Hour, Minute)
// Note: Months are 0-indexed (0 = January, 1 = February, etc.)
const launchDate = new Date(2026, 2, 1, 12, 0, 0);
```

Examples:
- March 1, 2026 at 12:00 PM: `new Date(2026, 2, 1, 12, 0, 0)`
- December 25, 2026 at 9:00 AM: `new Date(2026, 11, 25, 9, 0, 0)`
- June 15, 2026 at 6:30 PM: `new Date(2026, 5, 15, 18, 30, 0)`

### 2. Configure Logo

The logo is automatically fetched from the admin panel settings:

1. Go to `/admin/settings`
2. Upload your logo in the "Site Logo" section
3. The launch page will automatically display it

If no logo is uploaded, it will display the site name from settings.

### 3. Change Background Image

Edit `app/launch/page.tsx` (around line 47) and change the image URL:

```typescript
<Image
  src="YOUR_IMAGE_URL_HERE"
  alt="Photography Background"
  // ... rest of props
/>
```

### 4. Email Notification Integration

To integrate the email notification form with your backend:

1. Locate the `handleEmailSubmit` function in `app/launch/page.tsx` (around line 25)
2. Replace the console.log with your API call:

```typescript
const handleEmailSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    const response = await fetch('/api/notify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    
    if (response.ok) {
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setEmail('');
      }, 3000);
    }
  } catch (error) {
    console.error('Failed to submit email:', error);
  }
};
```

### 5. Customize Colors

The page uses a premium gold + black theme. To change colors, update these values:

**Gold color:** `#C5A572` (used throughout)
**Secondary gold:** `#B39563` (lighter shade)

Update in:
- `app/launch/page.tsx`: Search for `#C5A572` and `#B39563`
- `src/components/Countdown.tsx`: Update the colors in FlipCard component

## Accessing the Page

Navigate to: `http://localhost:3000/launch` or `yourdomain.com/launch`

## Design Features

### Layout Structure
- **Logo Section**: Large centered logo above everything (32-56 responsive sizes)
- **Two Bento Boxes**: Separate rounded boxes with gap (4-6 units)
- **Left Box**: Full-height photography image with rounded corners
- **Right Box**: White/dark content area with all information
- **Grid System**: Responsive 2-column grid (stacks on mobile)
- **Background**: Gradient with gold radial accents

### Background Gradients
1. **Base Gradient**: Light gray to white (light mode) / Dark gradient (dark mode)
2. **Top Right Radial**: Gold (#C5A572) with 15% opacity
3. **Bottom Left Radial**: Gold (#C5A572) with 10% opacity
4. Creates subtle ambient glow effect

### Logo Section
- **Size**: 128px → 224px (sm to lg breakpoints)
- **Position**: Centered above both boxes
- **Style**: Clean, no background box or border
- **Spacing**: 8-12 units margin below

### Left Box - Image
- **Content**: Camera/lens photography
- **Height**: 400px (mobile) → 600px (desktop)
- **Style**: Rounded 3xl, shadow-2xl
- **Overlay**: Subtle gradient for depth
- **Background**: White/dark matching content box

### Right Box - Content
- **Background**: Pure white (light) / #1a1a1a (dark)
- **Padding**: Responsive (8-16 units)
- **Alignment**: Vertical center, left-aligned text
- **Shadow**: Heavy shadow-2xl matching left box

### Content Elements (Right Box)
1. **Top Info**: Brand name + tagline in small text
2. **Main Heading**: Large "COMING SOON" in serif font (5xl-8xl)
3. **Countdown**: Simple numbers with labels below (4xl-7xl, no boxes)
4. **Email Form**: Inline input + button (full width on mobile)
5. **Bottom Bar**: Instagram link + launch date (border top)

### Visual Style
- **Colors**: Black/white (light mode), white/black (dark mode)
- **Typography**: Georgia serif for heading, system fonts for body
- **Numbers**: 4xl-7xl countdown numbers, clean and bold
- **Spacing**: Generous padding, vertical rhythm
- **Effects**: Subtle fade-in animation only
- **Shadows**: Heavy shadows on both boxes for elevation

### Responsive Behavior
- **Desktop (lg)**: Two boxes side-by-side, 600px image height
- **Tablet (md)**: Two boxes side-by-side with adjusted spacing
- **Mobile (< lg)**: Stacked - logo, image box (400px), content box

## Customization Tips

### Change Background Image
Update line ~37 in `app/launch/page.tsx`:

```typescript
<Image
  src="YOUR_IMAGE_URL_HERE"
  alt="Friends Media House Photography"
  // ... rest
/>
```

### Adjust Logo Size
Modify logo container sizing (around line ~17):

```typescript
// Current: w-32 to w-56 (responsive)
className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56"

// Smaller logo
className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48"

// Larger logo
className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64"
```

### Change Gap Between Boxes
Modify gap in grid (line ~28):

```typescript
// Current gap
className="grid lg:grid-cols-2 gap-4 sm:gap-6"

// Smaller gap
className="grid lg:grid-cols-2 gap-2 sm:gap-4"

// Larger gap
className="grid lg:grid-cols-2 gap-6 sm:gap-8"
```

### Adjust Background Gradient Colors
Edit gradient layers (lines ~6-7):

```typescript
// Change gold accent color and opacity
<div className="... rgba(197,165,114,0.15) ..." />  // Top right
<div className="... rgba(197,165,114,0.1) ..." />   // Bottom left

// Use different color (e.g., blue)
<div className="... rgba(59,130,246,0.15) ..." />
```

### Adjust Image Box Height
Modify height classes (line ~31):

```typescript
// Current heights
className="... h-[400px] sm:h-[500px] lg:h-[600px]"

// Shorter boxes
className="... h-[300px] sm:h-[400px] lg:h-[500px]"

// Taller boxes
className="... h-[500px] sm:h-[600px] lg:h-[700px]"
```

### Adjust Countdown Size
Modify text size classes (around line ~77):

```typescript
// Current: text-4xl to text-7xl (responsive)
className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl ..."

// Smaller countdown
className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl ..."

// Larger countdown
className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl ..."
```

### Remove Box Shadows
To make boxes flat, remove shadow classes:

```typescript
// Current with shadows
className="... shadow-2xl ..."

// Without shadows
className="... shadow-none ..."

// With lighter shadows
className="... shadow-lg ..."
```

### Adjust Box Rounding
Change border radius (lines ~31, 48):

```typescript
// Current: rounded-3xl (24px)
className="... rounded-3xl ..."

// More rounded
className="... rounded-[32px] ..."

// Less rounded
className="... rounded-2xl ..."

// Square corners
className="... rounded-none ..."
```

### Hide Logo
Comment out lines ~15-25 if you don't want the logo:

```typescript
{/* Logo Section
{mounted && settings.logoUrl && (
  ...
)}
*/}
```

## Troubleshooting

### Logo not showing
1. Check if logo is uploaded in admin settings
2. Verify `logoUrl` in browser console: `localStorage.getItem('siteSettings')`
3. Ensure image URL is accessible

### Countdown not updating
1. Check browser console for errors
2. Verify launch date is in the future
3. Try clearing browser cache

### Background image not loading
1. Verify the image URL is accessible
2. Check Next.js Image configuration in `next.config.mjs`
3. Use external image domain if needed

## Credits

Designed for Friends Media House with premium glassmorphism aesthetics and cinematic photography theme.
