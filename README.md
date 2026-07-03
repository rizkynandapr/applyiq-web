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
| Backend / 