# BOU CSE Form & Eligibility Hub

Independent Next.js project for preparing BOU CSE registration, failed/absent and grade-improvement forms.

## Features

- Adaptive form for all three application categories
- Local-only result text parsing and eligibility checking
- Editable notice fees, deadlines and late-fine settings
- Browser-local draft saving; no student data is uploaded
- Direct A4 PDF download with BOU logo and embedded Baskerville font
- Responsive Bangla-first interface

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

1. Extract this ZIP.
2. Upload the folder to GitHub and import it in Vercel, or use the Vercel CLI.
3. Keep the detected framework as **Next.js** and click **Deploy**.

No environment variables, database, API key or separately managed server is required.

## Update reference data

- Courses, official links and fee defaults: `lib/bou-data.ts`
- Form behaviour and UI: `app/form-hub.tsx`
- Website and PDF styling: `app/globals.css`

Students should always verify fees, dates and course offerings against the latest official BOU notice.
