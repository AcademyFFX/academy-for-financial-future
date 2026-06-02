# Project Structure

```text
academy-for-financial-future/
├── app/
│   ├── api/certificates/route.ts # Certificate generation API starter
│   ├── page.tsx                 # Home
│   ├── about/page.tsx           # About Academy
│   ├── courses/page.tsx         # Forex Courses
│   ├── dashboard/page.tsx       # Student Dashboard
│   ├── journal/page.tsx         # Trading Journal
│   ├── assignments/page.tsx     # Homework Submission
│   ├── exams/page.tsx           # Certification Exams
│   ├── certificates/page.tsx    # Certificate Generation
│   ├── announcements/page.tsx   # Announcements
│   ├── contact/page.tsx         # Contact
│   ├── login/page.tsx           # Supabase Login UI
│   ├── register/page.tsx        # Student Registration UI
│   ├── admin/page.tsx           # Admin Dashboard
│   ├── layout.tsx               # Shared application shell
│   └── globals.css              # Tailwind base and brand utilities
├── components/
│   ├── auth-panel.tsx           # Supabase auth form
│   ├── page-header.tsx          # Shared page hero header
│   ├── progress.tsx             # Course progress indicator
│   ├── section.tsx              # Layout helpers
│   └── site-shell.tsx           # Header, navigation, footer
├── lib/
│   ├── data.ts                  # Demo platform data
│   └── supabase.ts              # Supabase browser client
├── public/
│   ├── downloads/               # Starter PDF resources
│   └── images/academy-hero.png  # Generated luxury finance hero asset
├── supabase/schema.sql          # Starter database schema and RLS
├── middleware.ts                 # Supabase protected route middleware
├── .github/workflows/ci.yml      # GitHub Actions build check
├── DEPLOYMENT_PLAN.md           # Supabase and Vercel plan
├── README.md
└── package.json
```
