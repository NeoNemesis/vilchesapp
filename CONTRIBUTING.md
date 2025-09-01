# 🤝 Bidrag till Vilches Property Management System

Tack för ditt intresse att bidra till vårt projektledningssystem! Detta dokument beskriver hur du kan bidra på bästa sätt.

## 📋 Innan du börjar

- **Läs README.md** för att förstå projektet
- **Kontrollera Issues** för att se vad som behöver göras
- **Diskutera större ändringar** i en Issue först

## 🚀 Snabbstart

### 1. Fork och klona
```bash
# Fork repository på GitHub
git clone https://github.com/YOUR_USERNAME/vilches-property-management.git
cd vilches-property-management
```

### 2. Installera dependencies
```bash
npm run install:all
```

### 3. Konfigurera miljö
```bash
cp .env.example backend/.env
# Redigera backend/.env med dina inställningar
```

### 4. Starta utvecklingsmiljö
```bash
npm run dev
```

## 🔧 Utvecklingsmiljö

### Backend
- **Port:** 3001
- **Database:** PostgreSQL
- **ORM:** Prisma
- **API:** REST med Express

### Frontend
- **Port:** 3000
- **Framework:** React + TypeScript
- **Styling:** Tailwind CSS
- **State:** React Query

## 📝 Kodstandarder

### TypeScript
- **Strikt typing** - undvik `any`
- **Interfaces** för alla datastrukturer
- **Enums** för konstanter
- **Generics** när det är lämpligt

### React
- **Functional components** med hooks
- **TypeScript** för alla props och state
- **Custom hooks** för logik
- **Error boundaries** för felhantering

### Backend
- **Async/await** istället för callbacks
- **Error handling** med try-catch
- **Input validation** med Zod
- **Logging** för debugging

### Namngivning
- **Svenska** för användargränssnitt
- **Engelska** för kod och variabler
- **Beskrivande namn** - undvik förkortningar
- **Konsistent** genom hela projektet

## 🧪 Testing

### Backend
```bash
cd backend
npm test
npm run test:watch
```

### Frontend
```bash
cd frontend
npm test
npm run test:coverage
```

### E2E Testing
```bash
npm run test:e2e
```

## 📊 Database

### Migrations
```bash
npm run db:migrate
npm run db:generate
```

### Prisma Studio
```bash
npm run db:studio
```

### Seed Data
```bash
npm run db:seed
```

## 🔍 Code Review Process

### 1. Skapa en Pull Request
- **Beskrivande titel** som förklarar ändringen
- **Detaljerad beskrivning** av vad som gjorts
- **Screenshots** för UI-ändringar
- **Test-instructions** för granskare

### 2. Code Review Checklist
- [ ] Kod följer projektets standarder
- [ ] Alla tester passerar
- [ ] Dokumentation uppdaterad
- [ ] Inga console.log eller debug-kod
- [ ] Felhantering implementerad
- [ ] Performance-överväganden gjorda

### 3. Efter godkännande
- **Squash commits** om det behövs
- **Merge till main branch**
- **Tagga release** om det är en ny version

## 🐛 Bug Reports

### Bug Report Template
```markdown
**Beskrivning:**
Kort beskrivning av problemet

**Steg för att reproducera:**
1. Gå till...
2. Klicka på...
3. Se fel...

**Förväntat beteende:**
Vad som borde hända

**Faktiskt beteende:**
Vad som händer istället

**Miljö:**
- OS: [Windows/Mac/Linux]
- Browser: [Chrome/Firefox/Safari]
- Version: [X.X.X]

**Screenshots:**
Lägg till screenshots om relevant
```

## 💡 Feature Requests

### Feature Request Template
```markdown
**Problem:**
Beskriv problemet som denna feature löser

**Lösning:**
Beskriv hur du vill att det ska fungera

**Alternativ:**
Andra sätt att lösa problemet

**Ytterligare kontext:**
Bilder, länkar, eller annan information
```

## 📚 Dokumentation

### Uppdatera dokumentation när du:
- **Lägger till nya API endpoints**
- **Ändrar databas-schema**
- **Lägger till nya komponenter**
- **Ändrar konfiguration**

### Dokumentationsstandarder
- **Markdown-format** för alla dokument
- **Kodexempel** för komplexa funktioner
- **Screenshots** för UI-funktioner
- **Uppdatera README.md** vid behov

## 🚨 Säkerhet

### Rapportera säkerhetsproblem
- **Privat** via email till info@vilchesab.se
- **Beskriv problemet** i detalj
- **Vänta på svar** innan publicering
- **Följ responsible disclosure**

### Säkerhetsstandarder
- **Validera all input** från användare
- **Använd HTTPS** i produktion
- **Uppdatera dependencies** regelbundet
- **Logga säkerhetshändelser**

## 🎯 Prioriterade områden

### Hög prioritet
- **Bug fixes** som påverkar funktionalitet
- **Säkerhetsproblem**
- **Performance-förbättringar**
- **Kritiska features**

### Medel prioritet
- **UI/UX förbättringar**
- **Nya funktioner**
- **Dokumentation**
- **Testing**

### Låg prioritet
- **Cosmetic changes**
- **Nice-to-have features**
- **Refactoring**
- **Code cleanup**

## 📞 Support

### Behöver hjälp?
- **GitHub Issues** för tekniska problem
- **Email** till info@vilchesab.se för allmänna frågor
- **Discussions** på GitHub för idéer och diskussioner

### Resurser
- [README.md](README.md) - Projektöversikt
- [API Documentation](docs/api.md) - API-referens
- [Database Schema](docs/database.md) - Databasstruktur
- [Deployment Guide](docs/deployment.md) - Deployment-instruktioner

## 🙏 Tack

Tack för att du bidrar till att göra detta system bättre för svenska entreprenörer! Ditt bidrag gör skillnad.

---

**Byggt med ❤️ för svenska entreprenörer**
