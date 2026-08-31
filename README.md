# BOU CSE Form & Eligibility Hub

An unofficial, privacy-friendly helper for preparing BOU B.Sc in CSE course registration, failed/absent re-exam, and grade-improvement forms.

## What it does

- One adaptive form with context-sensitive fields for all three application types.
- Five-step guided flow with a persistent live calculation panel and final full-form review.
- Bangla/English language switch saved on the student's device.
- Editable fee, deadline, and late-fine inputs; no annual code change is required when a notice changes.
- Full eight-semester course catalog from the CSE Handbook.
- Handbook-based improvement eligibility explanations.
- Local-only result-text parsing and draft saving. No database, account, or server-side student data.
- Direct PDF download plus browser print fallback for the official A4 layout.
- Direct links to official BOU results, handbooks, program details, and notices.

## Deploy to Vercel

1. Upload this project to GitHub, or import the project folder directly in Vercel.
2. Keep the default detected framework: **Next.js**.
3. Deploy. `vercel.json` runs `npm run build:vercel` automatically.

No environment variables, database, or external service is required.

## Local development

```bash
npm install
npm run dev
```

For a Vercel-compatible production check:

```bash
npm run build:vercel
```

## Admin: update a future notice

The changing notice data is centralized in one file:

- **data/site-config.json**

Update the current term, dates, fee amounts, offered courseCodes, registration profiles, demo-video URL, or Quick Help group there. Students can then press **বর্তমান notice-এর তথ্য বসান**; a fresh form stays blank until they explicitly apply the preset.

See **ADMIN_UPDATE_GUIDE.md** for the short Bangla walkthrough.

## Updating stable reference data

- Course catalog and official links: **lib/bou-data.ts**
- Notice-changing data: **data/site-config.json**

The form always lets the student override fee and fine values from the current notice.

## Disclaimer

This is not an official Bangladesh Open University service. Students must verify fees, dates, bank details, course offerings, and submission requirements against the latest official BOU notice and their study centre.
