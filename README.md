# Academy for Financial Future

Professional educational platform for the **Forex Training Division**, administered by **Dr. Jean Rene Moricette**.

Built with:

- Next.js App Router
- Tailwind CSS
- Supabase Authentication starter wiring
- Responsive luxury navy and gold financial-institution interface
- Vercel-ready configuration

## Pages

- Home
- About Academy
- Forex Courses
- Student Dashboard
- Trading Journal
- Assignments
- Certification Exams
- Certificates
- Announcements
- Contact
- Student Login
- Student Registration
- Admin Dashboard

## Quick Start

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add your Supabase project keys to enable authentication.

See `DEPLOYMENT_PLAN.md` for the full Supabase and Vercel deployment plan.

## Deployment Files

- `vercel.json` defines the Next.js build/install commands for Vercel.
- `.env.example` lists required public Supabase environment variables.
- `SUPABASE_SETUP.md` contains detailed Supabase Auth, database, and storage setup steps.
- `supabase/schema.sql` contains starter tables and row-level security policies.
