# OpsWriter

OpsWriter is a comprehensive web application for creating, managing, and distributing operational manuals with full revision traceability for regulated organizations.

## 🚀 Features

### Core Functionality
- **Manual Management**: Create, edit, clone, and organize operational manuals
- **Hierarchical Structure**: Multi-level chapter organization with automatic numbering
- **Revision Control**: Complete audit trail and revision history tracking
- **Review Workflow**: Draft → In Review → Approved/Rejected workflow with immutable snapshots
- **PDF Export**: Generate professional PDFs with watermarks, diff views, and clean exports
- **Search & Filter**: Advanced search across manuals with filtering by status, owner, and tags

### Security & Compliance
- **Domain Restriction**: Email authentication limited to @heliairsweden.com
- **Role-Based Access**: SysAdmin and Manager roles with appropriate permissions
- **Session Management**: 30-minute inactivity timeout for security
- **Audit Trail**: Immutable logging of all system actions for regulatory compliance
- **Field-Level History**: Track changes at the most granular level

## 🛠 Tech Stack

- **Frontend**: Next.js 14+ with React and TypeScript
- **Styling**: Tailwind CSS (DocGen-inspired UI)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Functions)
- **Hosting**: Vercel (serverless deployment)
- **PDF Generation**: puppeteer-core with @sparticuz/chromium
- **Email**: Resend SDK for transactional emails

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Vercel account (for deployment)
- Resend account (for email functionality)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/[your-username]/opswriter.git
cd opswriter
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# Optional: Sentry for error tracking
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### 4. Database Setup

Apply the database migrations to your Supabase project:

```bash
# Link to your Supabase project
npx supabase link --project-ref <your-project-ref>

# Apply migrations
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --project-id <your-project-id> > src/types/database.types.ts
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📂 Project Structure

```
opswriter/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── lib/             # Utilities and configurations
│   ├── hooks/           # Custom React hooks
│   └── types/           # TypeScript type definitions
├── supabase/
│   └── migrations/      # Database migration files
├── public/              # Static assets
└── docs/               # Documentation
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Database Management

The application uses Supabase for the backend:

- **Tables**: manuals, chapters, revisions, user_profiles, audit_logs, etc.
- **Row Level Security**: Implemented on all tables
- **Storage Buckets**: manual-attachments, organization-logos

### Key Features Implementation

1. **Authentication**: Supabase Auth with domain restriction
2. **Manual Editor**: Hierarchical chapter management with auto-numbering
3. **Revision System**: Field-level change tracking with snapshots
4. **PDF Generation**: Server-side rendering with Puppeteer
5. **Search**: Full-text search across manuals and metadata

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables
4. Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables in Vercel

Add the same environment variables from `.env.local` to your Vercel project settings.

## 🔒 Security Considerations

- HTTPS enforcement in production
- Row-level security policies on all database tables
- Session timeout after 30 minutes of inactivity
- Email domain restriction for user registration
- Encrypted data at rest (via Supabase/AWS)
- Immutable audit logs for compliance

## 📈 Roadmap

- [ ] Rich text editor integration (TipTap)
- [ ] Advanced PDF customization
- [ ] Real-time collaboration features
- [ ] API for third-party integrations
- [ ] Mobile application
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for Heli Air Sweden.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database by [Supabase](https://supabase.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Deployed on [Vercel](https://vercel.com/)

## 📞 Support

For support, please contact the development team at Heli Air Sweden.

---

**OpsWriter** - Streamlining operational documentation for regulated industries.