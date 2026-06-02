# Supabase Setup

## Authentication

1. Create a Supabase project.
2. Go to **Authentication > Providers**.
3. Enable **Email** authentication.
4. Configure the site URL:
   - Local: `http://localhost:3000`
   - Production: `https://your-vercel-domain.vercel.app`
5. Add redirect URLs:
   - `http://localhost:3000/**`
   - `https://your-vercel-domain.vercel.app/**`

## Database

1. Open **SQL Editor**.
2. Run `supabase/schema.sql`.
3. Confirm row-level security is enabled on:
   - `profiles`
   - `enrollments`
   - `submissions`

## Storage

Create these buckets:

- `lesson-pdfs`
- `assignment-submissions`
- `certificates`

Recommended bucket visibility:

- `lesson-pdfs`: public or signed URLs
- `assignment-submissions`: private
- `certificates`: private or signed URLs

## Environment Variables

Add these locally in `.env.local` and in Vercel project settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app
```
