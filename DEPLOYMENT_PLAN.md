# Academy for Financial Future Deployment Plan

## 1. Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local`.
3. Create a Supabase project and set:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## 2. Supabase Configuration

1. Open the Supabase SQL editor.
2. Run `supabase/schema.sql`.
3. Enable email authentication in Supabase Auth.
4. Create storage buckets:
   - `lesson-pdfs`
   - `assignment-submissions`
   - `certificates`
5. Add admin users by setting `profiles.role = 'admin'`.

## 3. Production Build

Run:

```bash
npm run build
```

Resolve any TypeScript or lint errors before deploying.

## 4. Vercel Deployment

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Add environment variables:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   NEXT_PUBLIC_SITE_URL=https://your-domain.com
   ```
4. Set framework preset to Next.js.
5. Deploy.

## 5. Post-Launch Checklist

- Replace placeholder contact details.
- Upload real PDF resources.
- Connect dashboard pages to Supabase queries.
- Add protected route middleware for student/admin dashboards.
- Connect assignment upload to Supabase Storage.
- Add quiz question tables and scoring logic.
- Generate certificate PDFs from completed enrollment records.
- Configure custom domain and SSL in Vercel.
