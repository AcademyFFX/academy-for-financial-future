# Academy for Financial Future

Professional educational platform for the **Forex Training Division**, administered by **Dr. Jean Rene Moricette**.

Built with:

- Next.js App Router
- Tailwind CSS
- Supabase Authentication starter wiring
- Protected-route middleware for student and admin areas
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
- Mobile Companion

## Quick Start

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add your Supabase project keys to enable authentication.

See `DEPLOYMENT_PLAN.md` for the full Supabase and Vercel deployment plan.

## Mobile Companion

The Expo-based iOS and Android companion app is in `mobile/`.

```bash
cd mobile
npm install
npm run start
```

The web platform also includes `/mobile-app` to document the companion app readiness plan for students and administrators.

## Deployment Files

- `vercel.json` defines the Next.js build/install commands for Vercel.
- `.github/workflows/ci.yml` runs a GitHub Actions build check on pushes and pull requests.
- `middleware.ts` redirects unauthenticated users away from protected training pages when Supabase is configured.
- `.env.example` lists required public Supabase environment variables.
- `SUPABASE_SETUP.md` contains detailed Supabase Auth, database, and storage setup steps.
- `supabase/schema.sql` contains starter tables and row-level security policies.
