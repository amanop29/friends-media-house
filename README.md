# Friends Media House 🎥

Modern event photography and videography portfolio website with admin dashboard.

![Next.js](https://img.shields.io/badge/Next.js-15.5.9-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue?logo=typescript)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)

---

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended) ⚡

```bash
# Clone the repository
git clone https://github.com/amanop29/friends-media-house.git
cd friends-media-house

# Install dependencies
npm install

# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link to your Vercel project
vercel link

# Pull environment variables automatically
vercel env pull

# Start development server
npm run dev
```

**That's it!** Open [http://localhost:3000](http://localhost:3000) 🎉

---

### Option 2: Using Setup Script

```bash
# Run the automated setup script
./setup.sh

# Start development server
npm run dev
```

---

### Option 3: Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

3. **Add your environment variables** (see `.env.example` for all required variables)

4. **Start development server:**
   ```bash
   npm run dev
   ```

---

## 📋 Features

### Public Website
- 🏠 Beautiful homepage with hero section
- 🖼️ Infinite scroll photo gallery with masonry layout
- 🎬 Video gallery with YouTube integration
- 📅 Event showcases with detailed pages
- 💬 Comment system on photos
- ⭐ Reviews and testimonials
- 📞 Contact form with email notifications
- ❓ FAQ section
- 👥 Team member profiles
- 🌓 Dark/Light mode toggle
- 📱 Fully responsive design

### Admin Dashboard
- 🔐 Secure admin authentication
- 📊 Analytics dashboard with stats
- 🖼️ Bulk photo upload to Cloudflare R2
- 🎥 Video management (YouTube & uploads)
- 📝 Event management (CRUD operations)
- 💬 Comment moderation
- ⭐ Review management
- 📧 Lead tracking and management
- ❓ FAQ management
- 👥 Team member management
- ⚙️ Settings configuration
- 📈 Activity logs

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15.5.9 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI, Shadcn/ui
- **Animations:** Framer Motion
- **Forms:** React Hook Form + Zod validation
- **State:** React Context API

### Backend
- **API:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Storage:** Cloudflare R2 (S3-compatible)
- **Email:** Resend API
- **Auth:** Custom implementation with bcrypt

### DevOps
- **Hosting:** Vercel
- **CI/CD:** Vercel Git Integration
- **Domain:** Custom domain with subdomain routing
- **CDN:** Cloudflare (for R2 storage)

---

## 📁 Project Structure

```
friends-media-house/
├── app/                          # Next.js App Router
│   ├── (main)/                  # Public pages
│   │   ├── page.tsx             # Homepage
│   │   ├── about/               # About page
│   │   ├── gallery/             # Photo gallery
│   │   ├── events/[slug]/       # Event detail pages
│   │   ├── contact/             # Contact form
│   │   └── reviews/             # Reviews page
│   ├── admin/                   # Admin dashboard
│   │   ├── page.tsx             # Dashboard
│   │   ├── login/               # Admin login
│   │   ├── galleries/           # Manage galleries
│   │   ├── upload/              # Upload media
│   │   ├── events/new/          # Create events
│   │   ├── leads/               # Lead management
│   │   ├── reviews/             # Review management
│   │   ├── comments/            # Comment moderation
│   │   ├── faqs/                # FAQ management
│   │   ├── team/                # Team management
│   │   └── settings/            # Settings
│   ├── api/                     # API Routes
│   │   ├── admin/               # Admin APIs
│   │   ├── auth/                # Authentication
│   │   ├── contact/             # Contact form
│   │   ├── events/              # Event APIs
│   │   ├── galleries/           # Gallery APIs
│   │   ├── upload/              # Upload APIs
│   │   └── ...                  # More APIs
│   └── layout.tsx               # Root layout
├── src/
│   ├── components/              # React components
│   │   ├── ui/                  # Shadcn/ui components
│   │   ├── Navbar.tsx           # Navigation
│   │   ├── Footer.tsx           # Footer
│   │   ├── EventCard.tsx        # Event cards
│   │   ├── InfiniteGallery.tsx  # Gallery component
│   │   └── ...                  # More components
│   ├── views/                   # Page views
│   │   ├── Home.tsx             # Homepage view
│   │   ├── Gallery.tsx          # Gallery view
│   │   ├── admin/               # Admin views
│   │   └── ...                  # More views
│   ├── lib/                     # Utilities
│   │   ├── supabase.ts          # Database client
│   │   ├── r2-storage.ts        # Storage client
│   │   ├── email.ts             # Email service
│   │   └── ...                  # More utilities
│   ├── contexts/                # React contexts
│   │   ├── AuthContext.tsx      # Auth state
│   │   └── ThemeContext.tsx     # Theme state
│   └── styles/
│       └── globals.css          # Global styles
├── public/                      # Static assets
├── middleware.ts                # Subdomain routing
├── next.config.mjs              # Next.js config
├── tailwind.config.ts           # Tailwind config
├── tsconfig.json                # TypeScript config
└── vercel.json                  # Vercel config
```

---

## 🔑 Environment Variables

### Required Services

Before deploying, you need accounts for:

1. **Supabase** (Database) - [Sign up](https://supabase.com)
2. **Cloudflare R2** (Storage) - [Sign up](https://cloudflare.com)
3. **Resend** (Email) - [Sign up](https://resend.com)

### Environment Variables List

See `.env.example` for all required variables:

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Cloudflare R2:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- **Resend:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_TO_EMAIL`
- **URLs:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ADMIN_URL`
- **Auth:** `NEXTAUTH_URL`, `NEXTAUTH_SECRET`

### Easy Management with Vercel CLI

```bash
# Pull environment variables from Vercel
vercel env pull

# Add a new variable
vercel env add VARIABLE_NAME

# List all variables
vercel env ls
```

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

#### Via CLI:
```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

#### Via Dashboard:
1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Add environment variables
5. Deploy!

**📚 Detailed Guide:** See [VERCEL-DEPLOYMENT-GUIDE.md](VERCEL-DEPLOYMENT-GUIDE.md)

### Domain Setup

The app uses subdomain routing:
- **Main site:** `friendsmediahouse.com` → Public website
- **Admin panel:** `admin.friendsmediahouse.com` → Admin dashboard

**📚 Domain Setup:** See [DOMAIN-CONFIGURATION.md](DOMAIN-CONFIGURATION.md)

---

## 🗄️ Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Run the SQL schema:
   - Go to SQL Editor in Supabase dashboard
   - Copy content from `DATABASE-SCHEMA-COMPLETE.sql`
   - Execute the SQL

3. Create admin user:
   ```sql
   INSERT INTO admin_users (email, password_hash, role, is_active)
   VALUES (
     'admin@friendsmediahouse.com',
     crypt('your_secure_password', gen_salt('bf')),
     'super_admin',
     true
   );
   ```

---

## 💾 Storage Setup (Cloudflare R2)

1. Create R2 bucket at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Enable public access on the bucket
3. Generate R2 API tokens
4. Copy bucket URL and credentials
5. Add to environment variables

**📚 Detailed Guide:** See [SETUP-CONFIGURATION.md](SETUP-CONFIGURATION.md)

---

## 📧 Email Setup (Resend)

1. Create account at [resend.com](https://resend.com)
2. Verify your domain (optional but recommended)
3. Generate API key
4. Add to environment variables

---

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript types
```

### Local Development Tips

- **Dev server:** Runs on `http://localhost:3000`
- **Hot reload:** Enabled with Turbopack
- **Admin access:** Both `/admin` and `admin.localhost:3000` work locally
- **API testing:** Use `/api/test-db` to verify database connection

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [VERCEL-DEPLOYMENT-GUIDE.md](VERCEL-DEPLOYMENT-GUIDE.md) | Complete Vercel deployment guide |
| [DOMAIN-CONFIGURATION.md](DOMAIN-CONFIGURATION.md) | Domain and subdomain setup |
| [SETUP-CONFIGURATION.md](SETUP-CONFIGURATION.md) | Initial project setup |
| [DEPLOYMENT-GOING-LIVE.md](DEPLOYMENT-GOING-LIVE.md) | Production deployment checklist |
| [DEPLOYMENT-READINESS-REPORT.md](DEPLOYMENT-READINESS-REPORT.md) | Code review and status |
| [PROJECT-DOCUMENTATION.md](PROJECT-DOCUMENTATION.md) | Project overview |
| [DATABASE-SCHEMA-COMPLETE.sql](DATABASE-SCHEMA-COMPLETE.sql) | Complete database schema |

---

## 🔒 Security

- **Admin routes** protected with middleware and authentication
- **Environment variables** never committed to Git
- **Password hashing** with bcrypt
- **Security headers** configured in middleware
- **HTTPS** enforced via Vercel
- **CORS** configured for API routes
- **Rate limiting** can be added for API routes

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is private and proprietary.

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/amanop29/friends-media-house/issues)
- **Documentation:** See docs folder
- **Vercel Support:** [vercel.com/support](https://vercel.com/support)

---

## 🙏 Acknowledgments

- **Next.js** - React framework
- **Vercel** - Hosting and deployment
- **Supabase** - Database and auth
- **Cloudflare** - Storage and CDN
- **Radix UI** - Accessible components
- **Shadcn/ui** - Beautiful UI components

---

## 📈 Status

- ✅ **Build:** Passing
- ✅ **Deployment:** Ready
- ✅ **Production:** Live
- ✅ **Domain:** Configured

---

**Made with ❤️ by Friends Media House**

---

## Quick Links

- 🌐 **Live Site:** [friendsmediahouse.com](https://friendsmediahouse.com)
- 🔐 **Admin:** [admin.friendsmediahouse.com](https://admin.friendsmediahouse.com)
- 📦 **Repository:** [github.com/amanop29/friends-media-house](https://github.com/amanop29/friends-media-house)
