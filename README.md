# 🏗️ Vilches Entreprenad AB - Property Management System

Ett professionellt projektledningssystem för bygg- och fastighetsentreprenörer, byggt med modern teknologi för att hantera projekt, underleverantörer och kundkommunikation.

## ✨ Funktioner

### 🎯 Projekthantering
- **Automatisk projektskapning** från email (info@vilchesab.se)
- **Bilduppladdning** för projekt och rapporter
- **Projektstatus-spårning** (PENDING → ASSIGNED → IN_PROGRESS → REPORTED → COMPLETED)
- **Prioritetshantering** (LOW, NORMAL, HIGH, URGENT)
- **Deadline-hantering** med påminnelser

### 👥 Underleverantörshantering
- **Entreprenör-registrering** med välkomstmail
- **Projektacceptering/avvisning** av tilldelade uppdrag
- **Rapportsystem** med bilder och progress-tracking
- **Automatiska notifikationer** vid statusändringar

### 📊 Admin Dashboard
- **Realtids-statistik** över alla projekt
- **Analytics och grafer** för intäkter och projekt
- **Aktivitets-feed** med senaste händelser
- **Snabb åtkomst** till viktiga funktioner

### 📧 Email-integration
- **IMAP-övervakning** av info@vilchesab.se
- **Automatisk projektgenerering** från leverantörsemail
- **Professionella notifikationer** till kunder och entreprenörer
- **Lösenordsåterställning** via email

## 🚀 Teknisk Stack

### Backend
- **Node.js** med TypeScript
- **Express.js** för REST API
- **Prisma ORM** med PostgreSQL
- **JWT-autentisering**
- **Multer** för filuppladdning
- **Nodemailer** för email-hantering
- **IMAP** för email-övervakning

### Frontend
- **React 18** med TypeScript
- **Vite** som build tool
- **Tailwind CSS** för styling
- **React Query** för state management
- **React Router** för navigation
- **Heroicons** för ikoner
- **Recharts** för grafer och diagram

### Databas
- **PostgreSQL** med Prisma schema
- **Automatiska migrations**
- **Relationell datamodell** för projekt, användare och rapporter

## 📋 Installation

### Förutsättningar
- Node.js 18+ 
- PostgreSQL 14+
- npm eller yarn

### 1. Klona repository
```bash
git clone https://github.com/yourusername/vilches-property-management.git
cd vilches-property-management
```

### 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env
# Redigera .env med dina databasuppgifter
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Databas-konfiguration
Skapa en `.env` fil i backend-mappen:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/vilches_property_management"
JWT_SECRET="your-super-secret-jwt-key"
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

## 🔧 Konfiguration

### Email Setup
1. **Gmail App Password** för SMTP
2. **IMAP-åtkomst** för info@vilchesab.se
3. **Email-templates** för notifikationer

### Databas
1. **PostgreSQL-instans** (lokal eller moln)
2. **Prisma migrations** för schema
3. **Seed-data** för utveckling

### Filuppladdning
1. **Uploads-mapp** med rätt permissions
2. **Max filstorlek** konfiguration
3. **Bildformat** validering

## 📱 Användning

### Admin-flöde
1. **Skapa projekt** manuellt eller via email
2. **Tilldela till entreprenör** från listan
3. **Övervaka progress** via dashboard
4. **Granska rapporter** och godkänn
5. **Skicka till kund** med professionell formatering

### Entreprenör-flöde
1. **Logga in** med tilldelade credentials
2. **Se tilldelade projekt** på dashboard
3. **Acceptera/avböj** projekt
4. **Skicka progress-rapporter** med bilder
5. **Uppdatera projektstatus** kontinuerligt

## 🏗️ Projektstruktur

```
property-management-app/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth & validation
│   │   └── index.ts        # Server startup
│   ├── prisma/             # Database schema & migrations
│   └── uploads/            # File storage
├── frontend/                # React frontend
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   └── types/          # TypeScript types
│   └── public/             # Static assets
└── docs/                    # Documentation
```

## 🔐 Säkerhet

- **JWT-tokens** för autentisering
- **Role-based access control** (ADMIN/CONTRACTOR)
- **Input validation** med Zod schemas
- **SQL injection protection** via Prisma
- **File upload validation** och scanning
- **CORS-konfiguration** för säker kommunikation

## 📊 API Endpoints

### Projekt
- `GET /api/projects` - Lista alla projekt
- `POST /api/projects` - Skapa nytt projekt
- `GET /api/projects/:id` - Projektdetaljer
- `PUT /api/projects/:id/assign` - Tilldela projekt
- `PUT /api/projects/:id/accept` - Acceptera projekt
- `PUT /api/projects/:id/reject` - Avvisa projekt

### Entreprenörer
- `GET /api/contractors` - Lista entreprenörer
- `POST /api/contractors` - Skapa entreprenör
- `POST /api/contractors/:id/send-welcome` - Skicka välkomstmail

### Dashboard
- `GET /api/projects/dashboard-stats` - Dashboard-statistik
- `GET /api/projects/analytics` - Analytics-data
- `GET /api/projects/recent` - Senaste projekt

## 🚀 Deployment

### Produktion
1. **Environment variables** för produktion
2. **SSL-certifikat** för HTTPS
3. **Database backup** strategi
4. **Monitoring** och logging
5. **CI/CD pipeline** med GitHub Actions

### Docker (kommande)
```bash
docker-compose up -d
```

## 🤝 Bidrag

1. **Fork** repository
2. **Skapa feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit** ändringar (`git commit -m 'Add some AmazingFeature'`)
4. **Push** till branch (`git push origin feature/AmazingFeature`)
5. **Öppna Pull Request**

## 📄 Licens

Detta projekt är licensierat under MIT License - se [LICENSE](LICENSE) filen för detaljer.

## 📞 Support

- **Email:** info@vilchesab.se
- **Issues:** [GitHub Issues](https://github.com/yourusername/vilches-property-management/issues)
- **Documentation:** [Wiki](https://github.com/yourusername/vilches-property-management/wiki)

## 🙏 Tack

Tack till alla som bidragit till detta projekt och till Vilches Entreprenad AB för möjligheten att bygga detta system.

---

**Byggt med ❤️ för svenska entreprenörer**
