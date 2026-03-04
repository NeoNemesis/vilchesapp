# 🎯 VILCHES OFFERT-SYSTEM - KOMPLETT GUIDE

**AI-Optimerat Offert & Projekthanteringssystem**

---

## 📋 Innehåll

1. [Översikt](#översikt)
2. [Installation & Setup](#installation--setup)
3. [Hur Systemet Fungerar](#hur-systemet-fungerar)
4. [API-Dokumentation](#api-dokumentation)
5. [AI-Sökning & Matchning](#ai-sökning--matchning)
6. [Användning](#användning)
7. [Arbetsflöde](#arbetsflöde)
8. [Datamodell](#datamodell)

---

## 📖 Översikt

### Vad Är Detta?

Ett komplett AI-drivet offert-system som:
- ✅ Skapar professionella offerter automatiskt
- ✅ Använder AI för att hitta liknande historiska projekt
- ✅ Genererar estimat baserat på tidigare erfarenhet
- ✅ Skickar offerter via email med PDF
- ✅ Lär sig från varje projekt för att bli bättre

### Nyckelfunktioner

**🤖 AI-Driven Estimering**
- Hittar liknande projekt i historiken
- Beräknar estimat baserat på viktade parametrar
- Justerar för area, komplexitet och special features
- Lär sig från faktiskt utfall

**📊 Strukturerad Data**
- Alla offerter sparas i databasen
- Automatiska nyckelord för sökning
- Fullständig arbetsuppdelning
- Materialbibliotek med priser

**📧 Automatisering**
- Generera PDF automatiskt
- Skicka via email från info@vilchesab.se
- Skapa projekt när offert accepteras
- Post-project analys för AI-träning

---

## 🚀 Installation & Setup

### 1. Databas (KLART ✅)

Migrationen är redan körd! Databasen innehåller nu:
- ✅ `Quote` - Offerter
- ✅ `QuoteLineItem` - Arbetsuppdelning
- ✅ `QuoteMaterial` - Material
- ✅ `Material` - Materialbibliotek
- ✅ `QuoteTemplate` - Projektmallar
- ✅ `QuoteTag` - Tags för AI-sökning

### 2. Seed-Data (KLART ✅)

Materialbiblioteket innehåller redan:
- ✅ 28 vanliga material
- ✅ 5 projektmallar (Badrum, Garderob, Tapetsering, Fasad)

### 3. Integrera API i Din App

**Lägg till i din `app.js` eller `server.js`:**

```javascript
// Importera quotes-router
const quotesRouter = require('./routes/quotes');

// Lägg till route
app.use('/api/quotes', quotesRouter);
```

### 4. Konfigurera Email

**Lägg till i `.env`:**

```env
# SMTP för offert-emails
SMTP_HOST=smtp.loopia.se
SMTP_PORT=587
SMTP_USER=info@vilchesab.se
SMTP_PASSWORD=ditt-lösenord-här
```

### 5. Installera Beroenden (Om Saknas)

```bash
npm install pdfkit
# Nodemailer verkar redan installerat
```

---

## 🎯 Hur Systemet Fungerar

### Arbetsflöde

```
1. SKAPA OFFERT
   ↓
   [Användaren fyller i projektdetaljer]
   ↓
   [AI hittar liknande historiska projekt]
   ↓
   [AI genererar estimat baserat på likhet]
   ↓
   [Offert skapas med nyckelord för framtida sökning]

2. SKICKA OFFERT
   ↓
   [PDF genereras automatiskt]
   ↓
   [Email skickas till kund från info@vilchesab.se]
   ↓
   [Status uppdateras till "SENT"]

3. OFFERT ACCEPTERAD
   ↓
   [Projekt skapas automatiskt i Vilches-appen]
   ↓
   [Status uppdateras till "ACCEPTED"]

4. EFTER PROJEKTET
   ↓
   [Logga faktiskt utfall (timmar, kostnad, överraskningar)]
   ↓
   [AI lär sig för nästa liknande projekt]
```

### AI-Matchning (Hur Det Fungerar)

**Viktade Parametrar:**
```
Kategori:        30% (VÅTRUM, KÖK, etc.)
Area:            20% (8 kvm vs 7.5 kvm)
Komplexitet:     15% (1-5 skala)
Special Features: 15% (golvvärme, etc.)
Skick:           10% (good, fair, poor)
Plats:            5% (Bromma, Uppsala, etc.)
Nyckelord:        5% (semantisk matchning)
```

**Exempel:**

```
Ny offert:
- Badrum 8 kvm
- Komplexitet: 3 (Medel)
- Golvvärme: JA
- Bromma

AI hittar:
1. Badrum 7.5 kvm, Vällingby, Golvvärme → 95% likhet ⭐
2. Badrum 9 kvm, Sundbyberg, Golvvärme → 91% likhet
3. Badrum 8 kvm, Solna, Ingen golvvärme → 78% likhet

AI beräknar:
- Genomsnittliga timmar från de 3 projekten (viktat)
- Justerar för area-skillnad (8 vs 7.5 = +7%)
- Justerar för komplexitet
- Föreslår arbetsuppdelning
```

---

## 📡 API-Dokumentation

### Endpoints

#### 1. Lista Offerter
```http
GET /api/quotes?status=DRAFT&page=1&limit=20
```

**Query Parameters:**
- `status` - DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED
- `mainCategory` - VATRUM, KOK, TAK, etc.
- `search` - Fritext-sökning
- `page` - Sidnummer (default: 1)
- `limit` - Antal per sida (default: 20)

**Response:**
```json
{
  "quotes": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### 2. Hämta Specifik Offert
```http
GET /api/quotes/:id
```

**Response:**
```json
{
  "id": "uuid",
  "quoteNumber": "2025-0001",
  "clientName": "Kund AB",
  "projectType": "Helrenovering badrum",
  "estimatedTotalHours": 96,
  "totalAfterRot": 148800,
  "lineItems": [...],
  "materials": [...],
  "tags": [...]
}
```

#### 3. Generera AI-Estimat
```http
POST /api/quotes/estimate
```

**Request Body:**
```json
{
  "mainCategory": "VATRUM",
  "subCategory": "BADRUM",
  "projectType": "Helrenovering badrum",
  "areaSqm": 8,
  "complexity": "MEDIUM",
  "hasGolvvarme": true,
  "location": "Bromma"
}
```

**Response:**
```json
{
  "estimated": {
    "totalHours": 112,
    "laborCost": 74600,
    "materialCost": 59236,
    "totalCost": 133836,
    "rotDeduction": 22380,
    "totalAfterRot": 111456
  },
  "confidence": 87,
  "basedOn": {
    "count": 3,
    "quotes": [
      {
        "id": "...",
        "quoteNumber": "2024-0089",
        "projectType": "Badrum 7.5 kvm",
        "similarity": 95
      }
    ]
  },
  "adjustments": {
    "areaFactor": 1.07,
    "complexityFactor": 1.0,
    "totalFactor": 1.07
  },
  "lineItemsSuggestion": [
    {
      "category": "RIVNING",
      "estimatedHours": 16,
      "hourlyRate": 650,
      "totalCost": 10400
    },
    ...
  ]
}
```

#### 4. Skapa Offert
```http
POST /api/quotes
```

**Request Body:**
```json
{
  "clientName": "John Doe",
  "clientEmail": "john@example.com",
  "clientPhone": "070-123456",
  "mainCategory": "VATRUM",
  "subCategory": "BADRUM",
  "projectType": "Helrenovering badrum",
  "areaSqm": 8,
  "complexity": "MEDIUM",
  "existingCondition": "FAIR",
  "hasGolvvarme": true,
  "location": "Bromma",
  "locationType": "SUBURB",
  "accessDifficulty": "EASY",
  "useAI": true,
  "lineItems": [...],
  "materials": [...]
}
```

**Tips:**
- Sätt `useAI: true` för att generera estimat automatiskt
- Om `lineItems` saknas och `useAI: true`, skapas arbetsuppdelning från AI
- Nyckelord genereras automatiskt

#### 5. Skicka Offert via Email
```http
POST /api/quotes/:id/send
```

**Request Body:**
```json
{
  "to": "kund@example.com",
  "message": "Hej! Här kommer offerten..."
}
```

**Vad Händer:**
1. PDF genereras automatiskt
2. Email skickas med PDF-bilaga
3. Status uppdateras till "SENT"

#### 6. Acceptera Offert
```http
POST /api/quotes/:id/accept
```

**Vad Händer:**
1. Projekt skapas i Vilches-appen
2. Offert-status → "ACCEPTED"
3. Projektet kopplas till offerten

#### 7. Logga Faktiskt Utfall (Efter Projektet)
```http
POST /api/quotes/:id/post-project
```

**Request Body:**
```json
{
  "actualTotalHours": 126,
  "actualLaborCost": 82000,
  "actualMaterialCost": 61500,
  "actualLineItems": {...},
  "surprises": [
    {
      "description": "Hittade mögel bakom kakel",
      "impactHours": 12,
      "impactCost": 8500
    }
  ],
  "lessonsLearned": "Badrum före 1970: lägg alltid till 15% extra för VVS",
  "customerSatisfaction": 5
}
```

**Varför Detta Är Viktigt:**
- AI lär sig att nästa liknande projekt tar längre tid
- AI ser att gamla hus ofta har överraskningar
- Framtida estimat blir mer exakta

#### 8. Hitta Liknande Offerter
```http
GET /api/quotes/:id/similar
```

**Response:**
```json
[
  {
    "id": "...",
    "quoteNumber": "2024-0089",
    "projectType": "Badrum 7.5 kvm",
    "similarityScore": 0.95,
    "estimatedTotalHours": 112,
    "actualTotalHours": 120
  },
  ...
]
```

---

## 🎨 Användning

### Exempel 1: Skapa Offert Med AI

```javascript
// Frontend eller API-anrop
const response = await fetch('/api/quotes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientName: 'Anna Andersson',
    clientEmail: 'anna@example.com',
    mainCategory: 'VATRUM',
    subCategory: 'BADRUM',
    projectType: 'Helrenovering badrum',
    areaSqm: 8,
    complexity: 'MEDIUM',
    hasGolvvarme: true,
    location: 'Uppsala',
    locationType: 'SUBURB',
    accessDifficulty: 'EASY',
    existingCondition: 'FAIR',
    useAI: true  // ← AI genererar allt!
  })
});

const quote = await response.json();
console.log(`Offert skapad: ${quote.quoteNumber}`);
console.log(`Estimat: ${quote.totalAfterRot} kr`);
```

### Exempel 2: Först Testa Estimat, Sedan Skapa

```javascript
// Steg 1: Testa estimat först
const estimateResponse = await fetch('/api/quotes/estimate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mainCategory: 'VATRUM',
    areaSqm: 8,
    complexity: 'MEDIUM',
    hasGolvvarme: true
  })
});

const estimate = await estimateResponse.json();

console.log(`AI föreslår: ${estimate.estimated.totalAfterRot} kr`);
console.log(`Självsäkerhet: ${estimate.confidence}%`);
console.log(`Baserat på ${estimate.basedOn.count} liknande projekt`);

// Steg 2: Om estimatet ser bra ut, skapa offerten
if (estimate.confidence >= 70) {
  // Skapa offert med AI:ns förslag
  const quoteResponse = await fetch('/api/quotes', {
    method: 'POST',
    body: JSON.stringify({
      ...projektData,
      lineItems: estimate.lineItemsSuggestion,
      useAI: false  // Vi använder redan AI:ns förslag
    })
  });
}
```

### Exempel 3: Skicka Offert via Email

```javascript
// Generera PDF och skicka email
await fetch(`/api/quotes/${quoteId}/send`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'kund@example.com',
    message: 'Hej! Bifogat finner du offerten för ditt badrum.'
  })
});
```

### Exempel 4: Logga Utfall Efter Projektet

```javascript
// När projektet är klart
await fetch(`/api/quotes/${quoteId}/post-project`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    actualTotalHours: 126,  // Tog 14h längre än estimerat
    actualLaborCost: 82000,
    actualMaterialCost: 61500,
    surprises: [
      {
        description: 'Gammal vattenledning behövde bytas',
        impactHours: 8,
        impactCost: 6000
      }
    ],
    lessonsLearned: 'Hus från 1960-talet: lägg alltid till 15% extra för VVS',
    customerSatisfaction: 5
  })
});
```

---

## 🧠 AI-Sökning & Matchning

### Hur Nyckelord Genereras

**Automatiskt från:**
- Projekttyp → "helrenovering", "badrum", "golvvärme"
- Area → "8kvm", "medel" (område)
- Plats → "bromma", "uppsala"
- Komplexitet → "medel", "komplext"
- Special features → "golvvärme", "el-uppdatering"
- Säsong → "vår", "sommar", "höst", "vinter"

**Exempel:**
```javascript
Input:
{
  projectType: "Helrenovering badrum med golvvärme",
  areaSqm: 8,
  location: "Bromma",
  complexity: "MEDIUM",
  hasGolvvarme: true
}

Genererade nyckelord:
["badrum", "golvvärme", "helrenovering", "8kvm", "medel", "bromma", "vår"]
```

### Sökalgorithm

**1. Kategori-Matchning (30%)**
```
Exakt match på mainCategory: +50%
Exakt match på subCategory: +50%
Total: 100% för perfekt match
```

**2. Area-Matchning (20%)**
```
Skillnad = |8 - 7.5| = 0.5 kvm
Score = 1 - (0.5 / 8) = 0.937 = 94%
```

**3. Komplexitet-Matchning (15%)**
```
MEDIUM vs MEDIUM = 100%
MEDIUM vs COMPLEX = 75%
MEDIUM vs VERY_COMPLEX = 50%
```

**4. Feature-Matchning (15%)**
```
Antal matchande features / Totalt antal features
Exempel: 3 av 4 features matchar = 75%
```

**5. Total Similarity Score**
```
Total = (0.3 × kategori) + (0.2 × area) + (0.15 × komplexitet) + ...
Exempel: 0.92 = 92% likhet
```

---

## 📊 Datamodell

### Quote (Offert)

**Grundläggande:**
- `quoteNumber` - "2025-0001"
- `clientName` - Kundnamn
- `projectType` - "Helrenovering badrum"
- `status` - DRAFT | SENT | ACCEPTED | REJECTED

**AI-Optimerat:**
- `keywords[]` - Automatiska nyckelord
- `searchText` - Fulltext för sökning
- `similarityScore` - Likhet vid matching
- `confidenceLevel` - AI:ns självsäkerhet
- `basedOnQuoteIds[]` - Vilka offerter användes

**Mått:**
- `areaSqm` - Area i kvm
- `complexity` - VERY_SIMPLE → VERY_COMPLEX
- `existingCondition` - EXCELLENT → VERY_POOR

**Special Features:**
- `hasGolvvarme`
- `hasElUpdate`
- `hasVvsUpdate`
- `hasMovingWalls`
- osv...

**Post-Project (för AI-träning):**
- `actualTotalHours` - Faktiskt antal timmar
- `surprises[]` - Överraskningar som påverkade
- `lessonsLearned` - Lärdomar för framtiden
- `variancePercent` - Skillnad estimat vs faktiskt

---

## 🎓 Tips & Best Practices

### 1. Logga ALLTID Faktiskt Utfall

**Varför:** AI blir 10x bättre med faktisk data!

```javascript
// Efter VARJE projekt
await logPostProject({
  actualHours: 126,
  surprises: ["Hittade mögel"],
  lessonsLearned: "Gamla hus tar 20% längre tid"
});
```

### 2. Använd Projektmallar

För vanliga jobb (badrum, kök):
```javascript
// Hämta mall
const template = await fetch('/api/quotes/templates/list?mainCategory=VATRUM');

// Använd mall
await fetch(`/api/quotes/templates/${templateId}/use`);
```

### 3. Uppdatera Materialpriser Regelbundet

```javascript
// En gång per månad
await fetch(`/api/quotes/materials/${materialId}`, {
  method: 'PUT',
  body: JSON.stringify({
    currentPrice: 480,  // Nytt pris
    priceUpdatedAt: new Date()
  })
});
```

### 4. Kontrollera AI:ns Självsäkerhet

```javascript
if (estimate.confidence < 70) {
  console.warn('⚠️ Låg självsäkerhet - granska estimatet manuellt');
}
```

---

## ❓ FAQ

**Q: Hur många historiska offerter behövs för bra AI-estimat?**
A: Minst 5-10 för varje kategori. Efter 20-30 blir estimaten mycket exakta.

**Q: Vad händer om AI inte hittar liknande projekt?**
A: Då används projektmallar som fallback.

**Q: Kan jag justera AI:ns förslag?**
A: Ja! AI ger förslag, du bestämmer slutgiltigt.

**Q: Sparas kunddata säkert?**
A: Ja, all data är i din PostgreSQL-databas. Lägg till kryptering för extra säkerhet.

---

## 🚀 Nästa Steg

1. **Integrera routen** i din app.js
2. **Konfigurera SMTP** för emails
3. **Skapa första offerten** via API
4. **Logga utfall** efter projektet
5. **Profiten** när AI blir smartare! 🎉

---

**Utvecklat för Vilches Entreprenad**
*AI-optimerat offert-system 2025*
