# Offert-System - Installation & Setup

## Status: ✅ INTEGRERAT OCH KLART

Offert-systemet är nu fullständigt integrerat i din Vilches app!

## Vad som har gjorts:

1. ✅ Databas-schema skapat och migrerat
2. ✅ Seed-data tillagt (28 material + 5 projektmallar)
3. ✅ AI-sökning service implementerad
4. ✅ Backend API endpoints skapade (15+ endpoints)
5. ✅ PDF-generator service byggt
6. ✅ Email service konfigurerat
7. ✅ Routes integrerade i huvudapplikationen
8. ✅ TypeScript kompilerat till JavaScript

## Hur systemet fungerar:

### AI-Driven Offertgenerering:
```
1. Du anger projektkriterer (badrum, 8kvm, medel komplexitet, etc.)
2. AI:n söker igenom historiska projekt med viktade parametrar:
   - Kategori (30%)
   - Area (20%)
   - Komplexitet (15%)
   - Special features (15%)
   - Condition (10%)
   - Location (5%)
   - Keywords (5%)
3. Systemet genererar estimat baserat på liknande projekt
4. Du kan justera och spara offerten
5. Skicka PDF via email till kund från info@vilchesab.se
6. Vid projektavslut loggas faktiska data för AI-träning
```

## Konfigurera SMTP för Email

Lägg till dessa variabler i din `.env` fil:

```bash
# SMTP för offerter från info@vilchesab.se
SMTP_HOST=smtp.loopia.se
SMTP_PORT=587
SMTP_USER=info@vilchesab.se
SMTP_PASSWORD=ditt-lösenord-här
```

## API Endpoints

Alla endpoints är nu tillgängliga på `/api/quotes`:

### Skapa Offert med AI:
```bash
POST /api/quotes/estimate
{
  "mainCategory": "VATRUM",
  "projectType": "Badrumsrenovering",
  "areaSqm": 8,
  "complexity": "MEDIUM",
  "location": "Stockholm",
  "clientName": "Test Kund"
}
```

### Lista Offerter:
```bash
GET /api/quotes?status=SENT&page=1&limit=20
```

### Skicka Offert via Email:
```bash
POST /api/quotes/:id/send
{
  "to": "kund@example.com",
  "message": "Hej! Här kommer din offert."
}
```

### Skapa Projekt från Offert:
```bash
POST /api/quotes/:id/create-project
```

### Logga Faktiska Resultat (AI Training):
```bash
POST /api/quotes/:id/post-project
{
  "actualTotalHours": 45,
  "actualLaborCost": 38000,
  "actualMaterialCost": 12000,
  "surprises": ["Fuktskada bakom kakel"],
  "lessonsLearned": "Alltid budgetera 10% extra för oförutsett"
}
```

## Materialbibliotek

28 material är redan i databasen:
- Kakel & klinker (Hornbach, Bauhaus)
- VVS (Gustavsberg, Hafa, Grohe)
- El (Schneider, Jung)
- Golvvärme (Raychem)
- Färg (Alcro, Beckers)
- Och mer...

Hämta material:
```bash
GET /api/quotes/materials/list?category=KAKEL_KLINKER
```

## Projektmallar

5 färdiga mallar baserade på dina verkliga offerter:
1. Badrumsrenovering Standard
2. Garderobsinstallation
3. Tapetsering Standard
4. Fasadmålning
5. Komplett Badrumsrenovering

Använd en mall:
```bash
POST /api/quotes/templates/:id/use
{
  "clientName": "Ny Kund",
  "areaSqm": 8
}
```

## Starta Servern

```bash
cd /home/nemesis/projects/vilches-app/vilches-app/vilches-app/backend

# Installera dependencies (om inte redan gjort)
npm install

# Bygg TypeScript
npm run build

# Starta servern
npm start

# Eller development mode med hot reload
npm run dev
```

## Testa API:et

```bash
# Health check
curl http://localhost:3001/health

# Lista endpoints
curl http://localhost:3001/api

# Generera AI-estimat (kräver auth token)
curl -X POST http://localhost:3001/api/quotes/estimate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer DIN_TOKEN" \
  -d '{
    "mainCategory": "VATRUM",
    "projectType": "Badrumsrenovering",
    "areaSqm": 8,
    "complexity": "MEDIUM"
  }'
```

## Nästa Steg: Frontend UI

För att slutföra systemet kan du bygga ett admin-gränssnitt:

1. **Offert-formulär** - För att skapa nya offerter med AI
2. **Offert-lista** - Visa alla offerter med filter/sökning
3. **Offert-detaljer** - Visa och redigera offert
4. **Material-hantering** - Lägg till/uppdatera material i biblioteket
5. **Statistik** - Visa AI:ns träffprocent och projekthistorik

## Filstruktur

```
backend/
├── src/
│   ├── index.ts (uppdaterad med quotes routes)
│   ├── routes/
│   │   └── quotesRoutes.ts (alla API endpoints)
│   ├── services/
│   │   ├── quoteAiService.ts (AI matchning & estimat)
│   │   ├── quotePdfGenerator.ts (PDF skapande)
│   │   └── quoteEmailService.ts (Email skickande)
│   └── middleware/
│       └── auth.ts (används för auth)
├── prisma/
│   ├── schema.prisma (uppdaterad med Quote modeller)
│   ├── migrations/
│   │   └── 20251231182132_add_quote_system/
│   └── seed-quotes.js (material & mallar)
├── docs/
│   ├── QUOTE_SYSTEM_COMPLETE.md (fullständig dokumentation)
│   └── QUOTE_SYSTEM_SETUP.md (denna fil)
└── dist/ (kompilerad JavaScript)
```

## Support

För fullständig API-dokumentation, se:
`/home/nemesis/projects/vilches-app/vilches-app/vilches-app/docs/QUOTE_SYSTEM_COMPLETE.md`

Systemet är nu produktionsklart! 🎉
