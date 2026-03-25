# BrainDeck — AI-Powered Document-to-Study-Card App

Transform any document into flashcards, summaries, or quizzes using AI.
Full-stack app with auth, profiles, saved decks, and a rich feature set.

## Quick Start

```bash
npm install
cp .env.example .env   # edit with your settings
npm run dev            # http://localhost:3000
```

MySQL via XAMPP is required for auth and deck features. The core study app (upload + generate) works without it.

## Database Setup (XAMPP)

1. **Start XAMPP** → start **Apache** and **MySQL**
2. **Open phpMyAdmin** → http://localhost/phpmyadmin
3. Click **Import** → upload `database.sql` from this project folder
4. That's it — all tables are created automatically

Or let Sequelize auto-create them: just start the server and it will create the tables on first run.

**Your `.env` settings (XAMPP defaults):**
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=braindeck
DB_USER=root
DB_PASS=
```


---

## Features

### Core
- Upload PDF, DOCX, PPTX, TXT, MD → generate Flashcards, Summaries, or Quiz cards
- 8 AI providers: Ollama (local/free), Claude, OpenAI, Groq, Mistral, Gemini, Together, OpenRouter, Custom
- Switch AI provider live from the navbar — no restart needed

### Authentication & Profiles
- Register / Login / Logout with JWT (15min access + 30d refresh tokens)
- Password reset via email
- Profile page with avatar and name editor
- Saved deck library — all generated decks stored per user

### Study Features
- **Spaced repetition (SM-2)** — cards scheduled by difficulty, tracks ease factor and intervals
- **Streaks & XP** — daily study streak, XP points, level system
- **Study dashboard** — 365-day heatmap, stats, quick-start
- **Focus mode** — fullscreen distraction-free study (F key)
- **Text-to-speech** — reads questions/answers aloud (T key)
- **Pomodoro timer** — floating 25/5 min timer with browser notifications (P key)
- **AI document chat** — floating chat bubble to ask questions about the uploaded doc
- **Dark mode** — full neumorphic dark theme (D key or toggle button)
- **Keyboard shortcuts** — full hotkey support (? to see all)

### Sharing & Export
- **Share deck** — generate a 72h public link anyone can study without an account
- **Export to Anki CSV** — import directly into Anki
- **Export as text** — printable cheat sheet
- **Score share image** — download a PNG of your quiz score to share
- **URL import** — paste any URL on the upload page to generate cards from web content

### Design
- Neumorphism + Glassmorphism design system throughout
- Fully responsive, mobile-first

---

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Upload | `/` | Home, file upload, URL import |
| Flashcards | `/flashcard.html` | Flip card study with SR |
| Summary | `/summary.html` | Key concept cards |
| Quiz | `/quiz.html` | Multiple choice with scoring |
| Dashboard | `/dashboard.html` | Streak, heatmap, stats |
| Decks | `/decks.html` | Saved deck library |
| Profile | `/profile.html` | Account settings |
| Login | `/login.html` | Authentication |
| Register | `/register.html` | Sign up |
| Shared | `/study/:id` | Public shared deck |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space / Enter | Flip card |
| → / L | Next card |
| ← / H | Previous card |
| G | Got it! |
| R | Need review |
| F | Toggle focus mode |
| D | Toggle dark mode |
| T | Toggle text-to-speech |
| P | Pause/resume Pomodoro |
| ? | Show all shortcuts |

---

## API Routes

### Auth
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — login
- `POST /api/auth/logout` — logout
- `POST /api/auth/refresh` — refresh access token
- `POST /api/auth/forgot-password` — send reset email
- `GET  /api/auth/me` — get own profile *(auth)*
- `PATCH /api/auth/me` — update profile *(auth)*

### Decks
- `GET    /api/decks` — list decks *(auth)*
- `POST   /api/decks` — save deck *(auth)*
- `GET    /api/decks/:id` — get deck *(auth)*
- `DELETE /api/decks/:id` — delete deck *(auth)*

### Core
- `POST /api/upload` — upload file
- `POST /api/generate` — generate cards from uploaded file
- `GET  /api/cards/:type` — get cards for type (session switching)

### Features
- `GET  /api/ai-mode` — get current AI mode/provider
- `POST /api/ai-mode` — switch AI provider + key at runtime
- `GET  /api/ollama/models` — list local Ollama models
- `POST /api/chat` — AI document chat
- `POST /api/url-import` — fetch URL and extract text
- `POST /api/share` — create shareable deck link
- `GET  /api/share/:id` — get shared deck
- `GET  /api/health` — health check

---

## Stack
- **Frontend** — HTML5, Bootstrap 5, Vanilla JS, Neumorphism + Glassmorphism CSS
- **Backend** — Node.js, Express.js, MongoDB (Mongoose)
- **Auth** — JWT access tokens + httpOnly refresh cookies, bcrypt
- **AI** — Ollama (local) or 7 cloud providers via universal API layer
- **Extraction** — pdf-parse, mammoth, adm-zip, tesseract.js

## Environment Variables

Copy `.env.example` to `.env`:

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/braindeck
JWT_SECRET=your-secret-here
AI_MODE=local                    # local or cloud
OLLAMA_URL=http://localhost:11434
CLAUDE_API_KEY=                  # optional — set in UI instead
```
