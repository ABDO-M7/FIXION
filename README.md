# Fixion — Educational Q&A Platform

A full-stack, production-ready educational Q&A platform connecting students with teachers.

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + Vanilla CSS |
| Backend | NestJS + TypeORM |
| Database | PostgreSQL (Neon serverless) |
| Auth | JWT (HttpOnly cookies) + Google OAuth |
| File Storage | Cloudflare R2 (S3-compatible) |
| Email | Resend |
| Real-time | Socket.io WebSockets |
| Deployment | Vercel (frontend) + Railway/Render (backend) |

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database (free tier)
- A [Cloudflare R2](https://cloudflare.com) bucket (free tier)
- A [Resend](https://resend.com) account (free tier)

### 1. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run start:dev
```

### 2. Setup Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your backend URL
npm install --legacy-peer-deps
npm run dev
```

### 3. Open the app

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1

## 📁 Project Structure

```
website/
├── backend/          # NestJS API
│   ├── src/
│   │   ├── modules/  # auth, users, questions, answers, subscriptions, notifications, uploads, admin
│   │   ├── common/   # guards, decorators, filters
│   │   └── config/   # configuration
│   └── Dockerfile
├── frontend/         # Next.js app
│   ├── app/          # App Router pages
│   │   ├── student/  # Student dashboard
│   │   ├── teacher/  # Teacher panel
│   │   └── admin/    # Admin dashboard
│   ├── components/   # Shared components
│   ├── lib/          # API client
│   └── store/        # Zustand state
├── docker-compose.yml
└── .github/workflows/main.yml
```

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| **Student** | Register, redeem codes, submit questions, view answers |
| **Teacher** | View all questions, write answers, assign categories |
| **Admin** | Generate codes, manage users, analytics dashboard |

## 🔐 Environment Variables

### Backend (`.env`)
Copy `backend/.env.example` and fill in:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — random secret strings
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `R2_*` — Cloudflare R2 credentials
- `RESEND_API_KEY` — Resend email service key

### Frontend (`.env.local`)
Copy `frontend/.env.local.example` and fill in:
- `NEXT_PUBLIC_BACKEND_PRIMARY` — Main backend URL
- `NEXT_PUBLIC_BACKEND_FALLBACK` — Fallback backend URL

## 🌐 Deployment

### Backend → Railway (Primary) + Render (Fallback)
1. Push code to GitHub
2. Connect Railway to your `backend/` directory
3. Set all environment variables from `.env.example`
4. Deploy — Railway auto-handles the rest

### Frontend → Vercel
1. Connect Vercel to your `frontend/` directory
2. Set `NEXT_PUBLIC_BACKEND_PRIMARY` to your Railway URL
3. Set `NEXT_PUBLIC_BACKEND_FALLBACK` to your Render URL
4. Deploy

### Automated CI/CD
Push to `main` → GitHub Actions automatically tests and deploys both services.

## 📦 API Reference

Base URL: `https://your-backend.railway.app/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new student |
| POST | `/auth/login` | Login |
| GET | `/auth/google` | Google OAuth |
| POST | `/subscriptions/redeem` | Redeem a code |
| POST | `/questions` | Submit question |
| GET | `/questions/my` | My questions |
| GET | `/questions` | All questions (teacher/admin) |
| POST | `/questions/:id/answers` | Submit answer (teacher) |
| POST | `/codes/generate` | Generate codes (admin) |
| GET | `/admin/analytics/overview` | Platform stats (admin) |

## 🔒 Security Features
- JWT access tokens (15min) + refresh tokens (7 days) in HttpOnly cookies
- bcrypt password hashing (cost factor 12)
- RBAC with NestJS Guards
- Subscription guard on question submission
- Rate limiting (100 req/15min, 10 req/60s on auth)
- helmet.js security headers
- Input validation with class-validator (whitelist mode)
- XSS protection via ValidationPipe
- CORS restricted to frontend origin
