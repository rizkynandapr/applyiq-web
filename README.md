# ApplyIQ

AI-powered job application assistant. Upload your resume, set your target role, and get back scored job matches with tailored cover letters — automatically.

**Flow:** React web form → resume parsed in-browser (PDF/DOCX) → sent to an n8n AI pipeline → results stored in Supabase → live dashboard with match scores and generated cover letters.

## Features

- **Multi-step application form** — profile, target role/location, and resume upload with drag & drop
- **Client-side resume parsing** — PDF (pdf.js) and DOCX (mammoth) extracted entirely in the browser
- **AI matching pipeline** — submission is sent to an n8n workflow that scores job matches and generates a cover letter per job using an LLM
- **Live dashboard** — polls Supabase for results (fast polling while processing, slow after), match score meter per job, one-click copy for cover letters

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, React Router 7 |
| Resume parsing | pdfjs-dist, mammoth |
| Backend / DB | Supabase (Postgres) |
| AI pipeline | n8n workflow (webhook-triggered) |

## Architecture

```
┌───────────────┐   webhook    ┌──────────────┐   insert    ┌──────────────┐
│  React app    │ ───────────▶ │ n8n pipeline │ ──────────▶ │   Supabase   │
│ (form + parse)│              │ (LLM scoring │             │ job_applica- │
│               │ ◀─────────── │  + cover     │ ◀────────── │ tions table  │
│  dashboard    │   polling    │  letters)    │             │              │
└───────────────┘              └──────────────┘             └──────────────┘
```

## AI Pipeline (n8n)

The full workflow is included in [`n8n/ApplyIQ-workflow.json`](n8n/ApplyIQ-workflow.json) — 22 nodes:

1. **Webhook** receives the submission from the web form
2. **Resume Screening AI** parses and profiles the resume
3. **CV Improvement AI** generates improvement suggestions
4. **Generate Job Titles AI** expands the target role into search queries
5. **Google Jobs search** (SerpApi) pulls live listings
6. **Job Scoring AI** scores each listing against the resume (loop)
7. **Filter** keeps only worthwhile matches
8. **Cover Letter AI** writes a tailored cover letter per job
9. **Supabase** stores the final rows for the dashboard

To use it: import the JSON into n8n, then attach your own credentials (OpenAI, SerpApi, Supabase) — all credential IDs have been stripped.

## Getting Started

```bash
git clone https://github.com/<your-username>/applyiq-web.git
cd applyiq-web
npm install
cp .env.example .env   # fill in your own values
npm run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_N8N_WEBHOOK_URL` | n8n webhook endpoint that receives submissions |

### Supabase

Requires a `job_applications` table with (at minimum): `submitter_email`, `job_title`, `company`, `match_score`, `recommendation`, `cover_letter`, `job_link`, `created_at`.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint

## Author

**Rizky Nanda Praditia** — AI Engineer & Prompt Trainer, Yogyakarta 🇮🇩
