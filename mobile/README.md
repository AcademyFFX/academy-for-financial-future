# Academy for Financial Future Mobile Companion

Expo companion app for the Academy for Financial Future Academy for Financial Future.

## Included Mobile Views

- Student Dashboard
- Courses
- Trading Journal
- Assignments
- Live Trading Room
- Certification Exams
- Certificates
- Messaging Center

## Setup

```bash
cd mobile
npm install
cp .env.example .env
npm run start
```

Environment variables:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_ACADEMY_WEB_URL=https://your-vercel-domain.vercel.app
```

## Supabase Integration Plan

The mobile app includes a Supabase adapter in `src/academyApi.ts`. Connect live student data by replacing the starter data in `src/academyData.ts` with queries to the existing Academy tables:

- `students`
- `course_progress`
- `trading_journal`
- `assignments`
- `exams`
- `certificates`
- `student_messages`
- `zoom_class_sessions`
- `live_trade_ideas`

## iOS Deployment

```bash
cd mobile
npx eas login
npx eas init
npm run build:ios
npm run submit:ios
```

Before production submission:

- Replace `extra.eas.projectId` in `app.json`.
- Confirm `ios.bundleIdentifier`.
- Add App Store Connect app record.
- Configure app icon, splash assets, privacy labels, and support URL.
- Test with TestFlight.

## Android Deployment

```bash
cd mobile
npx eas login
npx eas init
npm run build:android
npm run submit:android
```

Before production submission:

- Confirm `android.package`.
- Add Google Play Console app record.
- Configure app icon, adaptive icon, privacy policy, data safety, and release track.
- Test with internal testing before production.

## AFF Branding

The mobile theme in `src/theme.ts` preserves the Academy navy and gold identity:

- Navy: `#07111f`, `#0b1728`, `#10233c`
- Gold: `#d6ad55`, `#e3c675`, `#f3dc9b`
- Ink: `#dce6f5`
