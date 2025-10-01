# OpsWriter Setup Guide

## 🚀 Quick Start

### 1. Database Setup (Required First!)

The database schema needs to be applied manually through Supabase Dashboard:

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/mjpmvthvroflooywoyss/sql/new
   ```

2. **Copy the schema:** Open `src/database/schema.sql` and copy all contents

3. **Run the migration:** Paste in SQL Editor and click "RUN" (or Cmd/Ctrl + Enter)

4. **Verify the schema:** Run the verification script from `scripts/verify-schema.sql`
   - Should show: 14 tables, 6 enums, 40+ indexes, 10+ triggers

### 2. Running the Application

The development server is already running at:
```
http://localhost:3002
```

If you need to restart it:
```bash
npm run dev
```

### 3. Create Your First User

1. Navigate to http://localhost:3002/signup
2. Enter your details to create an account
3. You'll be redirected to the dashboard

### 4. Environment Variables

Already configured in `.env.local`:
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ⚠️ SUPABASE_SERVICE_ROLE_KEY (needs to be added for admin functions)
- ⚠️ RESEND_API_KEY (needs to be added for email functionality)

### 5. Next Steps

After the schema is applied and you've created a user:

1. **Create your first manual:** Go to Dashboard > Manuals > New Manual
2. **Manage references:** Add Definitions and Abbreviations
3. **Test the workflow:** Create draft → Send for review → Approve
4. **Export PDFs:** Generate different variants (watermarked, diff, clean)

## 📁 Project Structure

```
OpsWriter/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Login/Signup pages
│   │   ├── dashboard/         # Protected dashboard pages
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   ├── lib/supabase/         # Supabase client setup
│   ├── types/                # TypeScript types
│   └── database/             # Database schema
├── scripts/                  # Utility scripts
├── .env.local               # Environment variables
└── TODO.md                  # Progress tracker
```

## 🛠️ Troubleshooting

### Schema Application Issues
- Make sure you're logged into Supabase Dashboard
- If you get foreign key errors, the schema might be partially applied
- Run `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` to reset and try again

### Authentication Issues
- Check that your Supabase project URL and anon key are correct
- Ensure the user_profiles table was created successfully
- Check browser console for any errors

### Development Server Issues
- The app runs on port 3002 (3000 and 3001 were already in use)
- If port conflicts occur, stop other processes or change the port in package.json

## 📚 Documentation

- **Supabase Dashboard:** https://supabase.com/dashboard/project/mjpmvthvroflooywoyss
- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **TipTap Editor:** https://tiptap.dev/docs

## 🆘 Need Help?

Check the following files for more information:
- `CLAUDE.md` - Project guidelines and architecture
- `TODO.md` - Feature implementation checklist
- `PRD.md` - Product requirements document