# Shvom - Master Implementation Plan & System Architecture

## 1. Brand Identity & Taglines
- **Brand Name**: Shvom
- **Wordmark Concept**: Refined, timeless serif typography with wide letter-spacing (`tracking-[0.25em]`), quiet luxury aesthetics.
- **Tagline Candidates**:
  1. *The Art of the Thoughtful Departure.* (Selected for Hero)
  2. *Quiet Elegance. Enduring Gratitude.*
  3. *Unspoken Prestige, Impeccably Curated.*
- **Palette**:
  - Warm Off-White: `#FAF8F5` (Canvas background)
  - Deep Charcoal: `#1A1A1A` (Primary typography & accents)
  - Muted Champagne Gold: `#B89B6A` (Subtle foil & highlight accent)
  - Editorial Stone / Cream: `#F2EFE9` & `#E7E3DC` (Borders & muted surfaces)
  - Soft Ink: `#5A5A58` (Secondary body & subtle metadata)

---

## 2. File & Directory Structure

```text
shvom/
├── README.md
├── ARCHITECTURE.md
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   ├── .env
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config/
│   │   │   ├── __init__.py
│   │   │   ├── brand.py
│   │   │   ├── pricing.py
│   │   │   └── questions.json
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── request.py
│   │   │   ├── consultation.py
│   │   │   └── admin_user.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── request.py
│   │   │   ├── consultation.py
│   │   │   └── auth.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── requests.py
│   │   │   ├── consultations.py
│   │   │   ├── uploads.py
│   │   │   ├── questions.py
│   │   │   ├── estimate.py
│   │   │   └── admin.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── estimator.py
│   │   │   ├── mailer.py
│   │   │   ├── pdf_generator.py
│   │   │   └── auth.py
│   │   └── static/
│   │       └── uploads/
│   └── tests/
│       ├── __init__.py
│       ├── test_estimator.py
│       └── test_requests.py
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── public/
    │   ├── favicon.svg
    │   ├── logo.svg
    │   └── og-image.jpg
    └── src/
        ├── config/
        │   └── brand.js
        ├── data/
        │   ├── questions.json
        │   └── galleryData.js
        ├── styles/
        │   └── index.css
        ├── components/
        │   ├── common/
        │   │   ├── Button.jsx
        │   │   ├── Section.jsx
        │   │   ├── Navbar.jsx
        │   │   ├── Footer.jsx
        │   │   ├── Lightbox.jsx
        │   │   └── SeoHead.jsx
        │   ├── designer/
        │   │   ├── ProgressBar.jsx
        │   │   ├── QuestionCard.jsx
        │   │   ├── SummaryPanel.jsx
        │   │   └── MoodGenerator.js
        │   └── admin/
        │       ├── RequestDetailModal.jsx
        │       └── StatusBadge.jsx
        ├── pages/
        │   ├── Home.jsx
        │   ├── Corporate.jsx
        │   ├── Weddings.jsx
        │   ├── Designer.jsx
        │   ├── Gallery.jsx
        │   ├── About.jsx
        │   ├── Contact.jsx
        │   └── AdminDashboard.jsx
        ├── hooks/
        │   ├── useLocalStorage.js
        │   └── useQuestionFlow.js
        ├── utils/
        │   ├── api.js
        │   └── formatters.js
        ├── App.jsx
        └── main.jsx
```

---

## 3. Implementation Phases
- **Phase 1**: Backend setup (FastAPI, SQLite models, rule-based pricing estimator, question schema endpoint, request processing, PDF summary generator using ReportLab, consultation bookings, JWT admin endpoints, pytest suite).
- **Phase 2**: Frontend initialization (Vite, React 18, Tailwind, fonts, brand config, SVG wordmark, responsive layout).
- **Phase 3**: Editorial pages (Home, Corporate, Weddings, About/Craft, Gallery with lightbox, Contact/Consultation).
- **Phase 4**: Core Feature: Interactive Gift Designer (Single-question card step-by-step, conditional logic for Corporate vs Weddings, dynamic live concept summary and price estimation, autosave in localStorage, logo uploads, PDF download, and quote submission).
- **Phase 5**: Admin Concierge Dashboard (Protected login, requests list, filter by status, detail modal, quote status update, direct PDF generation).
- **Phase 6**: Verification, automated testing, browser subagent testing, and final polish.
