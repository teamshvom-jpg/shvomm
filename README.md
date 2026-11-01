# Shvom &mdash; Bespoke Return-Gifting Studio

> **"The Art of the Thoughtful Departure"**  
> A quiet-luxury digital concierge platform for corporate event leaders and couture wedding clients. Handcrafted, bespoke, and discreetly luxurious.

---

## Brand Architecture & Zero-Hardcoding
All brand metadata, contact channels, and pricing logic are centralized in configuration files:
- **Frontend Brand Config**: [`frontend/src/config/brand.js`](frontend/src/config/brand.js)
- **Backend Brand Config**: [`backend/app/config/brand.py`](backend/app/config/brand.py)
- **Pricing Model**: [`backend/app/config/pricing.py`](backend/app/config/pricing.py)
- **Questions Schema**: [`backend/app/config/questions.json`](backend/app/config/questions.json) and [`frontend/src/data/questions.json`](frontend/src/data/questions.json)

---

## Tech Stack
- **Frontend**: React 18, Vite, React Router v6, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy (SQLite with PostgreSQL migration compatibility), Pydantic v2, ReportLab (Bespoke PDF Generation), JWT Bearer Auth.

---

## Quick Start & Running Locally

### 1. Backend Server (FastAPI)

1. Open a terminal in the root directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   - **Windows PowerShell / CMD**:
     ```bash
     .\venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```
3. (If installing fresh) Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The backend will automatically create `shvom.db` and seed initial admin credentials and sample requests.*

   - **API Docs (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - **Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

### 2. Frontend Application (React + Vite)

1. In a second terminal, navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. (If installing fresh) Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web application at:
   - **Client Portal**: [http://localhost:5173/](http://localhost:5173/)
   - **Interactive Gift Designer**: [http://localhost:5173/designer](http://localhost:5173/designer)
   - **Concierge Admin Portal**: [http://localhost:5173/admin](http://localhost:5173/admin)

---

## Demo Concierge Admin Login
Access the password-protected admin dashboard at `/admin`:
- **Username**: `concierge`
- **Passphrase**: `ShvomAtelier2026!`

Features in Admin:
- Review all incoming commission proposals with full JSON specification answers
- Update status: `New` &rarr; `Contacted` &rarr; `Quoted` &rarr; `Confirmed` &rarr; `Closed`
- Filter by status and real-time text search across patrons, reference codes, and destinations
- Instantly download formal, client-ready **Shvom-branded PDF proposals**

---

## Running Backend Automated Tests
From the root directory:
```bash
backend\venv\Scripts\pytest backend\tests -v
```
Tests cover:
- Rule-based price estimator algorithm across quantity tiers & packaging multipliers
- Question schema delivery
- Commission request submission & reference ID sequence (`SHV-YYYY-XXXX`)
- ReportLab PDF summary generation
- JWT concierge authentication & status patch updates

---

## Customization Guide

1. **Logo & Wordmark**:
   - The SVG wordmark is located at `frontend/public/logo.svg` and `frontend/public/favicon.svg`.
   - Update typography or letter spacing in `frontend/src/components/common/Navbar.jsx`.
2. **Contact Details**:
   - Modify phone, email, WhatsApp, and atelier address in `frontend/src/config/brand.js` and `backend/app/config/brand.py`.
3. **Imagery**:
   - Past work and gallery photographs are listed in `frontend/src/data/galleryData.js`. Replace Unsplash URLs with your own high-resolution photos in `frontend/public/`.
4. **Pricing Config**:
   - Base prices per category, packaging multipliers, and volume tiers are defined in `backend/app/config/pricing.py`.
5. **SMTP Email Delivery**:
   - Configure your SMTP host, user, and password in `backend/.env`. (When left blank, emails are automatically logged gracefully to the server console).
