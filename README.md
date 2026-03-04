# VilchesApp

**Professional project management system for contractors and service companies.**

Built by [Victor Vilches](https://github.com/NeoNemesis) — originally developed for construction and renovation companies in Sweden, now available as an open-source self-hosted solution for any business.

## Features

- **Project Management** — Create, assign, and track projects with team members
- **Quote System** — AI-powered estimates, PDF generation, email delivery
- **Time Reports** — Weekly hour tracking with approval workflow, PDF/CSV export
- **Employee Management** — Contractors and employees with role-based access
- **ROT/RUT Tax Deductions** — Swedish tax deduction calculations (optional)
- **Material Library** — Track materials with price history and supplier info
- **Email Integration** — SMTP notifications, welcome emails, password resets
- **Maps** — Geospatial project locations with Leaflet
- **Analytics** — Google Analytics 4 integration (optional)
- **SMS Notifications** — Via 46elks Swedish SMS API (optional)
- **Telegram Notifications** — Bot integration (optional)
- **Automation** — n8n workflow integration (optional)
- **PWA** — Installable as a mobile app from the browser

## Quick Start

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/NeoNemesis/vilchesapp.git
cd vilchesapp
docker compose up
```

Open `http://localhost:3000` — the Setup Wizard will guide you through configuration.

### Option 2: Manual Installation

**Requirements:** Node.js 18+, PostgreSQL 14+

```bash
# Clone
git clone https://github.com/NeoNemesis/vilchesapp.git
cd vilchesapp

# Setup backend
cd backend
cp .env.example .env    # Edit with your database credentials
npm install
npx prisma migrate deploy
npx prisma generate

# Setup frontend
cd ../frontend
cp .env.example .env
npm install

# Start both
cd ..
npm run dev
```

Open `http://localhost:3000` — the Setup Wizard will guide you.

## Setup Wizard

On first run, VilchesApp shows a setup wizard where you configure:

1. **Company info** — Name, org number
2. **Industry** — Pre-configured templates for:
   - Construction & Renovation (Bygg)
   - Cleaning & Facility Management (Stad)
   - Electrical & Plumbing (El & VVS)
   - Consulting (Konsult)
   - Custom
3. **Admin account** — Your first admin user
4. **Features** — Enable/disable modules you need

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL with Prisma ORM |
| Auth | JWT with refresh tokens, bcrypt |
| PDF | PDFKit |
| Email | Nodemailer (SMTP/IMAP) |
| Maps | Leaflet + React Leaflet |
| Charts | Recharts |
| State | TanStack React Query |
| PWA | Vite PWA Plugin |

## Project Structure

```
vilchesapp/
├── backend/
│   ├── src/
│   │   ├── config/          # Pricing configuration
│   │   ├── middleware/       # Auth, security, validation
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic, email, PDF
│   │   ├── setup/            # Setup wizard & templates
│   │   └── utils/            # Calculators, helpers
│   └── prisma/
│       └── schema.prisma     # Database schema
├── frontend/
│   ├── src/
│   │   ├── pages/            # Admin, Contractor, Employee views
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # Auth, AppSettings, Theme
│   │   └── services/         # API client
├── docker-compose.yml        # One-command setup
├── Dockerfile                # Backend + build
└── nginx.conf                # Frontend server
```

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full access: projects, quotes, employees, reports, settings |
| **Contractor** | Assigned projects, submit reports, calendar, map |
| **Employee** | Time reports, assigned projects, calendar |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login` | Login |
| `GET /api/projects` | List projects |
| `POST /api/quotes` | Create quote |
| `POST /api/quotes/:id/pdf` | Generate PDF |
| `POST /api/quotes/:id/send` | Email quote |
| `GET /api/time-reports` | Time reports |
| `GET /api/app-settings` | App configuration |
| `GET /api/setup/status` | Check if setup needed |
| `GET /health` | Health check |

See `GET /api` for the full endpoint list.

## Configuration

All configuration is done via environment variables. See `backend/.env.example` for the full list.

### Required
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret key for JWT tokens

### Optional (enable via Setup Wizard)
- SMTP settings for email
- Google Analytics credentials
- 46elks SMS API keys
- Telegram bot token
- n8n automation URL

## License

MIT License — see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

**VilchesApp** — Created by [Victor Vilches](https://github.com/NeoNemesis)
