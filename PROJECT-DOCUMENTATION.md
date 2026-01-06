# Friends Media House - Project Documentation

## Overview
Friends Media House is a professional event photography and videography portfolio website built with Next.js 15, featuring a modern design, image gallery management, admin dashboard, and comprehensive event management system.

---

## Domain Architecture

| Domain | Purpose |
|--------|--------|
| `friendsmediahouse.com` | Frontend - Public website |
| `admin.friendsmediahouse.com` | Admin Panel - Dashboard & management |
| `media.friendsmediahouse.com` | R2 Storage - Images & videos CDN |

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15.1.4 with App Router & Turbopack
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4.17 + CSS Variables
- **UI Components**: Radix UI (25+ primitive components)
- **Animations**: Framer Motion 11.15.0
- **Image Handling**: Next.js Image + Sharp 0.33.5 (server-side optimization)
- **Forms**: React Hook Form 7.55.0 + Zod 3.24.1 validation
- **Icons**: Lucide React 0.487.0
- **Gallery Layout**: React Responsive Masonry + Infinite Scroll

### Backend (Next.js API Routes)
- **Runtime**: Node.js with Next.js 15 App Router
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Storage**: Cloudflare R2 (S3-compatible via AWS SDK v3)
- **Email**: Resend 4.0.3 (transactional emails)
- **Image Processing**: Sharp (resize, WebP conversion, thumbnails, blur placeholders)
- **Authentication**: Dual-mode (Supabase Auth + localStorage fallback)
- **Validation**: Zod schema validation (client + server)
- **File Uploads**: AWS SDK S3 Client (@aws-sdk/client-s3)

### Deployment
- **Hosting**: Vercel (Edge Network)
- **CDN**: Cloudflare (R2 storage + caching)
- **Domains**: 
  - `friendsmediahouse.com` (frontend)
  - `admin.friendsmediahouse.com` (admin panel)
  - `media.friendsmediahouse.com` (R2 CDN)

---

## Project Structure

```
FRIENDS MEDIA HOUSE/
├── app/                          # Next.js App Router
│   ├── (main)/                   # Public pages layout group
│   │   ├── layout.tsx           # Main layout with Navbar & Footer
│   │   ├── page.tsx             # Home page
│   │   ├── about/               # About Us page
│   │   ├── contact/             # Contact page
│   │   ├── events/              # Event detail pages
│   │   ├── gallery/             # Gallery page
│   │   └── reviews/             # Reviews page
│   ├── admin/                   # Admin dashboard
│   │   ├── layout.tsx          # Admin layout with sidebar
│   │   ├── page.tsx            # Dashboard home
│   │   ├── add-event/          # Add new event
│   │   ├── comments/           # Photo comments management
│   │   ├── events/             # Events management
│   │   ├── faqs/               # FAQ management
│   │   ├── galleries/          # Gallery management
│   │   ├── leads/              # Lead management
│   │   ├── login/              # Admin login
│   │   ├── reviews/            # Reviews management
│   │   ├── settings/           # Site settings
│   │   └── upload/             # Bulk upload
│   ├── api/                    # API Routes
│   │   ├── admin/             # Admin API endpoints
│   │   ├── auth/              # Authentication endpoints
│   │   ├── contact/           # Contact form handler
│   │   ├── events/            # Public events API
│   │   ├── galleries/         # Gallery API
│   │   ├── upload/            # File upload handlers
│   │   └── videos/            # Video management
│   └── layout.tsx             # Root layout
├── src/
│   ├── components/            # Reusable React components
│   │   ├── ui/               # Shadcn UI components
│   │   ├── figma/            # Figma-designed components
│   │   ├── AdminSidebar.tsx
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── EventCard.tsx
│   │   └── ...
│   ├── contexts/             # React Context providers
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── lib/                  # Utility libraries
│   │   ├── supabase.ts      # Supabase client
│   │   ├── r2-storage.ts    # R2 storage utilities
│   │   ├── email.ts         # Email sending (Resend)
│   │   ├── events-store.ts  # Event management
│   │   ├── photos-store.ts  # Photo management
│   │   ├── videos-store.ts  # Video management
│   │   ├── leads-store.ts   # Lead management
│   │   ├── reviews-store.ts # Reviews management
│   │   ├── faqs-store.ts    # FAQ management
│   │   ├── settings.ts      # Site settings
│   │   ├── upload-helper.ts # Upload utilities
│   │   └── utils.ts         # General utilities
│   ├── styles/
│   │   └── globals.css      # Global styles & CSS variables
│   ├── types/               # TypeScript type definitions
│   └── views/               # Page view components
│       ├── Home.tsx
│       ├── AboutUs.tsx
│       ├── Gallery.tsx
│       └── admin/           # Admin view components
├── public/                  # Static assets
├── DATABASE-SCHEMA-COMPLETE.sql  # Database schema
├── package.json
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## Database Schema

### Main Tables

#### **events**
- Stores event/gallery information
- Fields: id, title, slug, description, couple_names, date, location, category, cover_image_url, is_visible, is_featured
- Indexes on: slug, category, date, visibility, featured status

#### **photos**
- Stores photos belonging to events
- Fields: id, event_id, url, thumbnail_url, blur_data_url, width, height, display_order
- Foreign key to events (CASCADE delete)

#### **videos**
- Stores videos (YouTube or uploaded)
- Fields: id, event_id, type (youtube/upload), url, thumbnail, title

#### **leads**
- Contact form submissions
- Fields: id, name, email, phone, event_type, event_date, message, status, source

#### **reviews**
- Client testimonials
- Fields: id, client_name, event_type, rating, comment, is_visible

#### **faqs**
- Frequently asked questions
- Fields: id, question, answer, category, is_visible, display_order

#### **photo_comments**
- Comments on photos (AI face recognition integration)
- Fields: id, photo_id, guest_name, guest_email, comment_text

#### **activity_logs**
- Admin activity tracking
- Fields: id, entity_type, entity_id, action, description, admin_email

#### **categories**
- Event categories
- Fields: id, slug, label, is_default, is_active

---

## API Routes Overview (15 Endpoints)

### Quick Reference Table

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/events/featured` | GET | ❌ | Fetch featured events for homepage |
| `/api/galleries/[id]/photos` | GET | ❌ | Paginated gallery photos |
| `/api/contact` | POST | ❌ | Contact form → leads + email |
| `/api/download-image` | GET | ❌ | Proxy image downloads |
| `/api/test-db` | GET | ❌ | Debug database connectivity |
| `/api/videos` | POST, DELETE | ❌ | Add/remove videos |
| `/api/auth/login` | POST | ❌ | Admin authentication |
| `/api/auth/change-password` | POST | ✅ | Change admin password |
| `/api/upload` | POST | ✅* | Image upload with Sharp processing |
| `/api/upload/public` | POST | ❌ | Public uploads (avatars, banners) |
| `/api/upload/video` | POST | ✅* | Video upload (max 500MB) |
| `/api/upload/delete` | POST | ✅* | Delete file from R2 |
| `/api/admin/events` | GET, POST | ✅ | List/create events |
| `/api/admin/events/[id]` | GET, PUT, DELETE | ✅ | CRUD single event |
| `/api/admin/leads` | GET, PATCH | ✅ | Leads management |

*Auth can be disabled via `UPLOAD_DISABLE_AUTH=true` for development

---

## API Routes - Complete Reference

### Public APIs

#### **GET /api/events/featured**
- **Purpose**: Fetch featured events for homepage display
- **Authentication**: None (public)
- **Query Parameters**:
  - `limit` (optional): Number of events to return (default: 6)
- **Response**:
  ```json
  {
    "events": [{ id, title, slug, date, location, category, coverImage, isFeatured, isVisible }],
    "count": number
  }
  ```
- **Flow**: Queries Supabase `events` table where `is_featured=true` and `is_visible=true`

#### **GET /api/galleries/[id]/photos**
- **Purpose**: Get paginated photos for a gallery/event
- **Authentication**: None (public)
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 24)
- **Response**:
  ```json
  {
    "photos": [{ id, url, thumbnail_url, blur_data_url, width, height }],
    "pagination": { page, limit, total, totalPages, hasMore }
  }
  ```

#### **POST /api/contact**
- **Purpose**: Submit contact form and create lead
- **Authentication**: None (public)
- **Request Body** (validated with Zod):
  ```json
  {
    "name": "string (min 2 chars)",
    "email": "valid email",
    "phone": "optional string",
    "message": "string (min 10 chars)",
    "eventInterest": "optional string"
  }
  ```
- **Response**:
  ```json
  { "success": true, "message": "string", "leadId": "uuid", "emailSent": boolean }
  ```
- **Flow**:
  1. Validates input with Zod
  2. Saves lead to Supabase `leads` table
  3. Sends notification email to admin via Resend
  4. Sends welcome email to user (non-blocking)

#### **GET /api/download-image**
- **Purpose**: Proxy image download with proper headers
- **Query Parameters**:
  - `url`: Full URL of image to download
- **Response**: Binary image with `Content-Disposition: attachment` header

#### **GET /api/test-db**
- **Purpose**: Debug endpoint to check database connectivity
- **Response**: Status of all tables, admin exists check, function availability

---

### Authentication APIs

#### **POST /api/auth/login**
- **Purpose**: Admin login authentication
- **Request Body**:
  ```json
  { "email": "string", "password": "string" }
  ```
- **Response** (success):
  ```json
  { "success": true, "admin": { id, email, name, role } }
  ```
- **Response** (failure): `{ "success": false, "error": "message" }`
- **Flow**:
  1. Queries `admins` table for email
  2. Checks `is_active` status
  3. Verifies password using `verify_admin_password` RPC function
  4. Updates `last_login` and `login_count`
  5. Returns admin info (without password hash)
- **Fallback**: Returns 503 if Supabase not configured, client falls back to localStorage auth

#### **POST /api/auth/change-password**
- **Purpose**: Change admin password
- **Request Body**:
  ```json
  { "adminId": "uuid", "currentPassword": "string", "newPassword": "string (min 8 chars)" }
  ```
- **Flow**:
  1. Verifies current password via `verify_admin_password` RPC
  2. Updates password via `update_admin_password` RPC

---

### Upload APIs

#### **POST /api/upload**
- **Purpose**: Upload image to R2 with optimization
- **Authentication**: Bearer token (can be disabled via `UPLOAD_DISABLE_AUTH=true`)
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: Image file (JPEG, PNG, WebP - max 10MB)
  - `folder`: Target folder (default: 'gallery')
  - `gallery_id` (optional): Supabase gallery UUID for database linking
- **Processing**:
  1. Validates file type and size
  2. Resizes to max 2400x2400 (fit inside, no enlargement)
  3. Converts to WebP (quality 85)
  4. Generates 400x400 thumbnail (WebP quality 70)
  5. Generates 20x20 blur placeholder (base64)
- **Response**:
  ```json
  { "success": true, "url": "R2 URL", "thumbnailUrl": "thumbnail URL", "blurDataUrl": "base64", "width": number, "height": number }
  ```

#### **POST /api/upload/public**
- **Purpose**: Public upload for avatars, logos, banners (no auth required)
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: Image (including SVG) - max 5MB
  - `folder`: 'banners' | 'logos' | 'avatars' | 'reviews'
- **Response**:
  ```json
  { "success": true, "url": "R2 URL", "key": "storage key" }
  ```

#### **POST /api/upload/video**
- **Purpose**: Upload video to R2
- **Authentication**: Bearer token (optional via env flag)
- **Form Fields**:
  - `file`: Video file (MP4, WebM, MOV, AVI, MKV - max 500MB)
  - `folder`: Target folder (default: 'videos')
  - `event_id` (optional): Links to Supabase event
- **Response**:
  ```json
  { "success": true, "url": "R2 URL", "key": "storage key", "fileSize": number, "fileName": "string" }
  ```

#### **POST /api/upload/delete**
- **Purpose**: Delete file from R2 storage
- **Authentication**: Authorization header required (unless disabled)
- **Request Body**:
  ```json
  { "url": "full R2 public URL to delete" }
  ```
- **Validation**: URL must start with configured R2_PUBLIC_URL
- **Flow**: Extracts key from URL, calls R2 DeleteObjectCommand

---

### Video API

#### **POST /api/videos**
- **Purpose**: Add video to Supabase
- **Request Body**:
  ```json
  { "eventId": "uuid", "video": { url, title, thumbnail, type, displayOrder, isFeatured } }
  ```
- **Response**:
  ```json
  { "success": true, "video": { id, supabaseId, url, thumbnail, title, type, uploadedAt, eventId } }
  ```
- **Note**: Extracts YouTube ID from YouTube URLs for embedding

#### **DELETE /api/videos?id=[videoId]**
- **Purpose**: Delete video from Supabase
- **Query Parameters**:
  - `id`: Video UUID

---

### Admin APIs

#### **GET /api/admin/events**
- **Purpose**: List all events with pagination
- **Authentication**: Bearer token (verifies admin role via profiles table)
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 20)
  - `category` (optional): Filter by category
  - `search` (optional): Search in title/description
- **Response**:
  ```json
  { "events": [...], "pagination": { page, limit, total, totalPages } }
  ```

#### **POST /api/admin/events**
- **Purpose**: Create new event
- **Authentication**: Bearer token
- **Request Body** (validated with Zod):
  ```json
  {
    "title": "string (min 3)",
    "slug": "string (min 3)",
    "description": "string",
    "date": "string",
    "location": "string",
    "category": "string",
    "cover_image": "valid URL",
    "is_featured": boolean,
    "is_visible": boolean
  }
  ```
- **Response**: Created event object (201)

#### **GET /api/admin/events/[id]**
- **Purpose**: Get single event with galleries
- **Authentication**: Bearer token
- **Response**: Event object with nested galleries

#### **PUT /api/admin/events/[id]**
- **Purpose**: Update event
- **Authentication**: Bearer token
- **Request Body**: Partial event fields to update
- **Response**: Updated event object

#### **DELETE /api/admin/events/[id]**
- **Purpose**: Delete event (cascade deletes photos/videos)
- **Authentication**: Bearer token
- **Response**: `{ "success": true }`

#### **GET /api/admin/leads**
- **Purpose**: List all leads with pagination
- **Authentication**: Bearer token
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 50)
  - `status` (optional): Filter by status
  - `search` (optional): Search in name/email/message
- **Response**:
  ```json
  { "leads": [...], "pagination": { page, limit, total, totalPages } }
  ```

#### **PATCH /api/admin/leads**
- **Purpose**: Update lead status
- **Authentication**: Bearer token
- **Request Body**:
  ```json
  { "id": "uuid", "status": "new|contacted|converted|closed" }
  ```

---

## Database Schema (Supabase PostgreSQL)

### Enum Types
```sql
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'converted', 'closed');
CREATE TYPE lead_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE lead_source AS ENUM ('website', 'contact_form', 'instagram', 'referral', 'other');
CREATE TYPE event_type AS ENUM ('wedding', 'pre-wedding', 'event', 'film', 'other');
CREATE TYPE video_type AS ENUM ('youtube', 'upload');
CREATE TYPE activity_entity AS ENUM ('event', 'photo', 'video', 'lead', 'review', 'comment', 'setting');
```

### Tables

| Table | Key Fields | Relationships |
|-------|-----------|---------------|
| **events** | id, title, slug (unique), couple_names, date, location, category, cover_image, cover_thumbnail, photo_count, video_count, view_count, is_visible, is_featured | - |
| **photos** | id, event_id, url, thumbnail_url, blur_data_url, width, height, display_order, like_count | FK → events (CASCADE) |
| **videos** | id, event_id, url, thumbnail_url, title, type, display_order | FK → events (CASCADE) |
| **leads** | id, name, email, phone, message, event_type, event_date, status, priority, source, notes | - |
| **reviews** | id, name, email, avatar_url, avatar_icon, rating (1-5), text, event_name, event_id, is_approved, is_featured, is_hidden | FK → events (SET NULL) |
| **photo_comments** | id, photo_id, guest_name, guest_email, comment, avatar, is_hidden | FK → photos (CASCADE) |
| **faqs** | id, question, answer, category, display_order, is_active | - |
| **settings** | id, key (unique), value (JSONB) | - |
| **activity_log** | id, action, entity_type, entity_id, admin_id, admin_email, details (JSONB) | - |
| **admins** | id, email (unique), name, role, password_hash, is_active, last_login, login_count | - |
| **categories** | id, slug (unique), label, display_order, is_active | - |

### Database Functions
- `verify_admin_password(admin_email, password_attempt)` - Verifies password using crypt
- `update_admin_password(admin_id, new_password)` - Updates password with hash
- `update_updated_at_column()` - Auto-updates `updated_at` timestamps
- `generate_event_slug()` - Auto-generates unique slug from title
- `update_event_photo_count()` - Trigger to maintain photo_count
- `update_event_video_count()` - Trigger to maintain video_count

---

## Storage Layer (Cloudflare R2)

### Configuration
```typescript
// r2-storage.ts uses AWS SDK S3 client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey }
});
```

### File Organization
```
R2 Bucket/
├── events/       # Event cover images
├── gallery/      # Event gallery photos + thumbnails
├── videos/       # Uploaded video files
├── banners/      # Homepage banners
├── logos/        # Site logos
├── avatars/      # User/admin avatars
└── reviews/      # Review avatars
```

### Upload Flow
1. **Client**: Uses `uploadToR2()` helper or direct FormData POST
2. **Server**: Validates file type/size
3. **Processing**: Sharp resizes/optimizes images
4. **Upload**: `PutObjectCommand` with immutable cache headers
5. **Response**: Returns public URL (`R2_PUBLIC_URL/key`)

### Naming Convention
- Main image: `{folder}/{timestamp}-{filename}.webp`
- Thumbnail: `{folder}/{timestamp}-thumb-{filename}.webp`

---

## Store Files (Data Management Layer)

Each store follows a pattern: **localStorage primary → Supabase sync (best effort)**

### events-store.ts
| Function | Description |
|----------|-------------|
| `getEvents()` | Gets events from localStorage (fallback to mock data) |
| `saveEvents(events)` | Saves to localStorage, dispatches `eventsUpdated` event |
| `addEvent(event)` | Auto-generates slug, adds to beginning of list |
| `updateEvent(event, oldCoverUrl?, oldThumbUrl?)` | Updates locally, syncs to Supabase, deletes old R2 files |
| `deleteEvent(event)` | Deletes photos/videos/cover from R2, removes from Supabase and localStorage |
| `toggleEventVisibility(eventId, visibility?)` | Toggles `isVisible` flag |
| `getEventsFromSupabase()` | Fetches from Supabase, maps to Event format |
| `getEventCount()` | Returns count from Supabase or localStorage |

### photos-store.ts
| Function | Description |
|----------|-------------|
| `getPhotos()` | Gets all photos from localStorage |
| `savePhotos(photos)` | Saves to localStorage, dispatches `photosUpdated` |
| `addPhotos(newPhotos)` | Adds multiple, syncs to Supabase with `supabaseEventId` |
| `deletePhoto(photoId, url?, thumbnailUrl?)` | Deletes from R2 (main + thumbnail), removes from Supabase |
| `getPhotosByEvent(eventId)` | Filters photos by event |
| `getPhotosWithEventContext()` | Fetches from `photos_with_event_details` view |
| `getPhotoCount()` | Returns count from Supabase |

### videos-store.ts
| Function | Description |
|----------|-------------|
| `getVideosFromSupabase()` | Fetches all videos from Supabase |
| `getEventVideos(eventId)` | Gets videos for specific event |
| `addVideo(video, eventId)` | Adds via POST /api/videos |
| `deleteVideo(videoId, url?, thumbnailUrl?)` | Deletes from R2 and Supabase |
| `syncEventVideos(eventId, localVideos)` | Syncs local array to Supabase (add new, delete removed) |
| `uploadVideoToR2(file)` | Uploads via /api/upload/video |

### leads-store.ts
| Function | Description |
|----------|-------------|
| `getLeads()` | Supabase first, localStorage fallback |
| `addLead(lead)` | Maps priority/eventType to valid enums, saves to Supabase |
| `updateLead(leadId, updates)` | Updates in Supabase |
| `deleteLead(leadId)` | Deletes from Supabase |

### reviews-store.ts
| Function | Description |
|----------|-------------|
| `getReviews()` | Supabase first, localStorage fallback |
| `addReview(review)` | Adds with `is_approved: false` |
| `updateReview(review)` | Updates in Supabase |
| `deleteReview(reviewId)` | Deletes from Supabase |
| `approveReview(reviewId)` | Sets `is_approved: true` |
| `toggleReviewVisibility(reviewId)` | Toggles `is_hidden` |

### faqs-store.ts
| Function | Description |
|----------|-------------|
| `getFAQs()` | localStorage only (no Supabase sync) |
| `saveFAQs(faqs)` | Saves to localStorage |
| `addFAQ(faq)` | Appends to list |
| `updateFAQ(faqId, updates)` | Updates by ID |
| `deleteFAQ(faqId)` | Removes by ID |

### comments-store.ts
| Function | Description |
|----------|-------------|
| `getComments()` | localStorage only |
| `addComment(comment)` | Adds to beginning |
| `updateComment(comment)` | Updates by ID |
| `deleteComment(commentId)` | Removes by ID |
| `toggleCommentVisibility(commentId)` | Toggles `hidden` flag |
| `getCommentsByPhoto(photoId)` | Filters by photo |

### categories-store.ts
| Function | Description |
|----------|-------------|
| `getCategories()` | Returns merged defaults + localStorage + Supabase |
| `fetchCategories()` | Fetches from Supabase, merges with local |
| `addCategory(category)` | Normalizes to slug, syncs to Supabase `categories` table |
| `deleteCategory(category)` | Prevents deletion of defaults, removes from Supabase |
| `getCategoryDisplayName(slug)` | Maps slug to human-readable label |

**Default Categories**: `['wedding', 'pre-wedding', 'event', 'film', 'jainism']`

### activity-log.ts
| Function | Description |
|----------|-------------|
| `getAdminEmail()` | Gets from localStorage |
| `logActivity(entry)` | Logs to Supabase `activity_log` table with action, entity_type, entity_id, admin_email, details |

---

## Authentication System

### AuthContext.tsx Flow
1. **Session Check**: On mount, reads `admin_session` from localStorage
2. **Session Expiry**: 24-hour expiry (`SESSION_EXPIRY_MS`)
3. **Login Flow**:
   - First tries `/api/auth/login` (Supabase)
   - If 503 (database not configured), falls back to localStorage auth
   - Default credentials: `admin@friendsmediahouse.com` / `FMH@2024Admin`
4. **Session Storage**: Stores `{ id, email, name, role, loginTime }` in localStorage
5. **Logout**: Clears `admin_session` and `adminEmail` from localStorage

### Middleware (middleware.ts)
- **Subdomain Routing**: Admin routes require `admin.*` subdomain (production only)
- **Local Development**: All routes accessible on localhost
- **Security Headers**:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **Caching**: Static assets get `max-age=31536000, immutable`

---

## Email System (Resend)

### email.ts Functions
| Function | Description |
|----------|-------------|
| `sendContactEmail(data)` | Sends styled HTML notification to admin |
| `sendWelcomeEmail(email, name)` | Sends thank-you email to user |

### Email Templates
- **Contact Email**: Professional HTML with gradient header, field labels, styled values
- **Welcome Email**: Thank-you message with company branding

---

## Data Flow Diagrams

### Image Upload Flow
```
User → Admin Panel → File Input
  ↓
Client-side compression (if > 2MB)
  ↓
POST /api/upload (FormData)
  ↓
Sharp processing (resize, optimize, thumbnail, blur)
  ↓
R2 PutObjectCommand (main + thumbnail)
  ↓
Return { url, thumbnailUrl, blurDataUrl, width, height }
  ↓
Store to localStorage + Supabase sync
  ↓
UI update via custom events
```

### Event Creation Flow
```
Admin → Event Form
  ↓
Cover image upload → R2
  ↓
Form validation (client-side)
  ↓
events-store.addEvent()
  ↓
localStorage.setItem()
  ↓
Supabase sync (best effort)
  ↓
logActivity() → activity_log table
  ↓
Dispatch 'eventsUpdated' event
  ↓
Toast notification
```

### Contact Form Flow
```
User → Contact Form
  ↓
Client validation (React Hook Form + Zod)
  ↓
POST /api/contact
  ↓
Zod server validation
  ↓
supabaseAdmin.from('leads').insert()
  ↓
sendContactEmail() → Admin notification
  ↓
sendWelcomeEmail() → User confirmation (async)
  ↓
Return { success, leadId, emailSent }
```

---

## Workflow

### User Journey (Public)

1. **Homepage** (`/`)
   - View hero banner with tagline
   - Browse featured events
   - View services offered
   - See client testimonials
   - Read FAQs

2. **Gallery** (`/gallery`)
   - Browse all events/galleries
   - Filter by category
   - View event details
   - Infinite scroll loading

3. **Event Detail** (`/events/[slug]`)
   - View event photos
   - Masonry layout gallery
   - Download photos
   - Comment on photos (with face recognition)
   - Watch event videos

4. **Contact** (`/contact`)
   - Submit inquiry form
   - Specify event type and date
   - Receive email confirmation

5. **About Us** (`/about`)
   - Learn about the company
   - View team members
   - See stats and timeline
   - Understand values

6. **Reviews** (`/reviews`)
   - Read client testimonials
   - Filter by event type
   - See ratings

### Admin Journey

1. **Login** (`/admin/login`)
   - Secure authentication via Supabase
   - Session management

2. **Dashboard** (`/admin`)
   - Overview statistics
   - Recent activity
   - Quick actions

3. **Event Management** (`/admin/add-event`, `/admin/events`)
   - Create new events
   - Upload cover images
   - Set categories and visibility
   - Mark events as featured
   - Edit/delete events

4. **Photo Upload** (`/admin/upload`)
   - Bulk upload photos
   - Automatic thumbnail generation
   - R2 storage integration
   - Associate with events

5. **Lead Management** (`/admin/leads`)
   - View contact submissions
   - Update lead status
   - Track follow-ups
   - Delete leads

6. **Content Management**
   - **Reviews** (`/admin/reviews`) - Approve/edit reviews
   - **FAQs** (`/admin/faqs`) - Manage Q&A
   - **Comments** (`/admin/comments`) - Moderate photo comments

7. **Settings** (`/admin/settings`)
   - Update site information
   - Change home banner
   - Modify tagline
   - Update contact details

---

## Features

### Core Features

1. **Event Portfolio Management**
   - Create, edit, delete events
   - Category organization (Wedding, Pre-Wedding, Events, Films)
   - Featured events showcase
   - Slug-based URLs

2. **Image Gallery**
   - Cloudflare R2 storage
   - Automatic thumbnail generation
   - Blur placeholder (LQIP)
   - Masonry layout
   - Infinite scroll
   - Download functionality
   - Lazy loading

3. **Video Integration**
   - YouTube embed support
   - Direct video uploads to R2
   - Custom thumbnails

4. **Lead Management**
   - Contact form with validation
   - Email notifications via Resend
   - Lead status tracking
   - Source tracking

5. **Client Reviews**
   - Star ratings
   - Testimonial management
   - Visibility controls

6. **FAQ System**
   - Category-based organization
   - Accordion UI
   - Admin management

7. **Photo Comments**
   - AI face recognition integration ready
   - Guest commenting
   - Email notifications

8. **Theme Support**
   - Light/Dark mode
   - Smooth transitions
   - CSS variables

9. **Responsive Design**
   - Mobile-first approach
   - Tablet optimization
   - Desktop enhancements

### Admin Features

- Secure authentication
- Activity logging
- Bulk operations
- Search and filters
- Pagination
- Real-time updates
- Toast notifications
- Modal dialogs
- Drag-and-drop uploads

---

## Data Flow

### Image Upload Flow

1. User selects image in admin panel
2. Frontend compresses image (if > 2MB)
3. Image uploaded to R2 via API route
4. R2 returns public URL
5. Thumbnail generated and stored
6. URLs saved to Supabase
7. localStorage synced
8. UI updated

### Event Creation Flow

1. Admin fills event form
2. Cover image uploaded to R2
3. Event data validated (Zod)
4. Event inserted to Supabase
5. Slug generated and verified unique
6. Event saved to localStorage (cache)
7. Activity logged
8. Success notification

### Contact Form Flow

1. User submits contact form
2. Data validated on client
3. POST to `/api/contact`
4. Saved to Supabase leads table
5. Email sent via Resend API
6. Confirmation to user
7. Admin notification

---

## Environment Variables

```env
# ===================
# SUPABASE (Required)
# ===================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ===================
# CLOUDFLARE R2 (Required)
# ===================
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=friendsmediahouse
R2_PUBLIC_URL=https://media.friendsmediahouse.com
NEXT_PUBLIC_R2_PUBLIC_URL=https://media.friendsmediahouse.com

# ===================
# RESEND EMAIL (Required)
# ===================
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@friendsmediahouse.com
RESEND_TO_EMAIL=contact@friendsmediahouse.com

# ===================
# OPTIONAL
# ===================
UPLOAD_DISABLE_AUTH=true  # Disable auth on upload routes (dev only)
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://friendsmediahouse.com
```

---

## Key Dependencies

```json
{
  "dependencies": {
    "next": "^15.1.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@supabase/supabase-js": "^2.47.10",
    "@aws-sdk/client-s3": "^3.699.0",
    "@aws-sdk/s3-request-presigner": "^3.699.0",
    "sharp": "^0.33.5",
    "framer-motion": "^11.15.0",
    "tailwindcss": "^3.4.17",
    "@radix-ui/react-*": "Various (25+ components)",
    "resend": "^4.0.3",
    "sonner": "^2.0.3",
    "zod": "^3.24.1",
    "react-hook-form": "^7.55.0",
    "lucide-react": "^0.487.0",
    "react-responsive-masonry": "^2.3.0"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/react": "^18.3.18",
    "eslint": "^8.57.1",
    "eslint-config-next": "^15.1.4"
  }
}
```

---

## Performance Optimizations

1. **Image Optimization**
   - Next.js Image component
   - Blur placeholders
   - Lazy loading
   - Responsive images

2. **Caching Strategy**
   - localStorage for offline capability
   - Supabase as source of truth
   - Optimistic UI updates

3. **Code Splitting**
   - Route-based splitting
   - Dynamic imports
   - Turbopack build optimization

4. **CDN Delivery**
   - Cloudflare R2 for images
   - Vercel Edge Network for pages
   - Static asset optimization

---

## Security

1. **Authentication**
   - Custom admin authentication with password hashing (`pgcrypto` crypt)
   - Password verification via `verify_admin_password` RPC function
   - Session stored in localStorage with 24-hour expiry
   - Fallback to local credentials when database unavailable
   - Default admin: `admin@friendsmediahouse.com` / `FMH@2024Admin`

2. **Middleware Protection**
   - Subdomain-based admin routing (production only)
   - Admin routes redirect to `admin.*` subdomain
   - Public routes redirect away from admin subdomain
   - Security headers on all responses:
     - `X-Frame-Options: DENY`
     - `X-Content-Type-Options: nosniff`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
   - Login page excluded from redirect loops

3. **API Security**
   - Bearer token verification for admin APIs
   - Role verification via `profiles` table
   - Zod validation on all inputs
   - URL validation for R2 deletion (bucket ownership check)
   - File type and size validation on uploads

4. **Storage Security**
   - Immutable cache headers on uploads (`max-age=31536000`)
   - Public bucket for CDN delivery
   - Key derivation from trusted `R2_PUBLIC_URL` only
   - Filename sanitization with timestamp prefix

---

## Architecture Notes

### Hybrid Storage Pattern
The application uses a **localStorage-primary, Supabase-sync** pattern:
- **localStorage**: Primary data source for offline capability and fast reads
- **Supabase**: Source of truth, synced on writes (best effort)
- **Custom Events**: Components listen to `eventsUpdated`, `photosUpdated`, etc.
- **Fallback**: Mock data when both localStorage and Supabase unavailable

### Why This Pattern?
1. **Offline Support**: App works without database connection
2. **Fast UI**: No loading states for cached data
3. **Resilience**: Graceful degradation if Supabase is down
4. **Development**: Works without database setup

### R2 File Cleanup
When deleting events/photos/videos:
1. Collects all R2 URLs (main images + thumbnails)
2. Calls `/api/upload/delete` for each URL
3. Validates URL ownership against `R2_PUBLIC_URL`
4. Deletes from Supabase
5. Removes from localStorage
6. Dispatches update events

### Image Processing Pipeline
```
Original Image → Sharp
  ├── Resize (max 2400x2400, fit inside, no enlargement)
  ├── Convert to WebP (quality 85%)
  ├── Generate thumbnail (400x400, cover crop, quality 70%)
  └── Generate blur placeholder (20x20 → base64 data URL)
```

### Middleware Route Handling
```typescript
// Production: Subdomain routing
admin.friendsmediahouse.com → /admin/* routes
friendsmediahouse.com → Public routes only

// Development: All routes on localhost:3000
localhost:3000/admin/* → Admin routes
localhost:3000/* → Public routes
```

---

## Domain & Hosting

### Production Domains
| Domain | Purpose | Handled By |
|--------|---------|------------|
| `friendsmediahouse.com` | Frontend | Vercel |
| `admin.friendsmediahouse.com` | Admin Panel | Vercel (middleware routing) |
| `media.friendsmediahouse.com` | R2 CDN | Cloudflare |

### URLs
- **Development**: `http://localhost:3000`
- **Production**: `https://friendsmediahouse.com`
- **Admin Panel**: `https://admin.friendsmediahouse.com`
- **Media CDN**: `https://media.friendsmediahouse.com`

### DNS Records
```
Type  | Name    | Content
------|---------|------------------
A     | @       | 76.76.21.21 (Vercel)
CNAME | www     | cname.vercel-dns.com
CNAME | admin   | cname.vercel-dns.com
CNAME | media   | <bucket>.r2.dev (R2 custom domain)
```

---

## Routing Configuration

### Public Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Home.tsx` | Homepage with hero, featured events, testimonials |
| `/gallery` | `Gallery.tsx` | All events gallery with filters |
| `/events/[slug]` | `EventDetail.tsx` | Single event photos & videos |
| `/about` | `AboutUs.tsx` | About page with team & timeline |
| `/reviews` | `Reviews.tsx` | Client testimonials |
| `/contact` | `Contact.tsx` | Contact form |

### Admin Routes (Protected)
| Path | Component | Description |
|------|-----------|-------------|
| `/admin` | `Dashboard.tsx` | Stats & quick actions |
| `/admin/login` | `Login.tsx` | Authentication |
| `/admin/add-event` | `AddEvent.tsx` | Create new event |
| `/admin/events/new` | `NewEvent.tsx` | New event wizard |
| `/admin/galleries` | `ManageGalleries.tsx` | Galleries list |
| `/admin/upload` | `BulkUpload.tsx` | Bulk photo upload |
| `/admin/leads` | `ManageLeads.tsx` | Contact submissions |
| `/admin/reviews` | `ManageReviews.tsx` | Testimonial moderation |
| `/admin/faqs` | `ManageFAQs.tsx` | FAQ management |
| `/admin/comments` | `ManageComments.tsx` | Photo comments |
| `/admin/settings` | `Settings.tsx` | Site configuration |

---

## Build & Deploy

### Development
```bash
npm run dev --turbo
```

### Production Build
```bash
npm run build
npm start
```

### Deployment
- Automatic deployment via Vercel
- GitHub integration
- Environment variables configured in Vercel dashboard

---

## Future Enhancements

1. AI Face Recognition for photo search
2. Client photo download portal with unique codes
3. Booking system integration
4. Payment gateway
5. Social media auto-posting
6. Advanced analytics dashboard
7. Multi-language support
8. Progressive Web App (PWA)

---

**Last Updated**: January 5, 2026
**Version**: 1.1.0
**Documentation Covers**: Complete API reference, database schema, storage layer, authentication, routing, and deployment configuration
