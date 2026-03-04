# 📧 Email-övervakning Konfiguration

## 🎯 Så här fungerar det

Systemet lyssnar på din `info@vilchesab.se` inbox och skapar automatiskt projekt från emails som kommer från **godkända avsändare**.

## ⚙️ Konfigurera godkända avsändare

Öppna filen: `src/config/emailFilters.ts`

### Lägg till ny avsändare:
```typescript
{
  email: '@exempel.se',              // Email eller domän att lyssna på
  name: 'Exempel Företag',          // Visningsnamn
  description: 'Beskrivning av vad de skickar',
  priority: 'HIGH',                 // LOW, NORMAL, HIGH, URGENT
  isActive: true,                   // true = lyssna, false = ignorera
  autoAssign: false,                // Automatisk tilldelning?
  assignToEmail: 'johan@vilchesab.se' // Email till den som ska få projektet
}
```

### Exempel på avsändare att lägga till:
- `@byggmax.se` - Byggmax serviceuppdrag
- `@hornbach.se` - Hornbach reparationer  
- `@if.se` - If försäkring skador
- `@stockholm.se` - Kommunala uppdrag
- `noreply@dinhemsida.se` - Kontaktformulär från hemsida

## 🚀 Starta email-övervakning

1. **Via API:**
   ```bash
   curl -X POST http://localhost:3001/api/email/start-monitoring
   ```

2. **Kolla status:**
   ```bash
   curl http://localhost:3001/api/email/monitoring-status
   ```

3. **Se godkända avsändare:**
   ```bash
   curl http://localhost:3001/api/email/approved-senders
   ```

## 📋 Vad händer när email kommer in?

1. **Email mottaget** → Systemet kollar avsändaren
2. **Godkänd avsändare?** → Skapar projekt automatiskt
3. **Ej godkänd?** → Ignoreras (loggas men inget projekt skapas)
4. **Projekt skapat** → Du får notifiering
5. **Auto-tilldelning?** → Skickas direkt till rätt person

## 🛡️ Säkerhet

- **Blockerade avsändare** ignoreras alltid (spam, reklam)
- **Endast godkända** emails blir projekt
- **Du kontrollerar** vilka som får komma igenom

## 🔧 Felsökning

### Email-övervakning startar inte:
- Kolla att IMAP-inställningar är korrekta i `.env`
- Kontrollera att lösenordet är ett "App Password" för Gmail/Hostinger

### Inga projekt skapas:
- Kolla att avsändaren finns i `APPROVED_SENDERS` och `isActive: true`
- Se loggar i konsolen för detaljer

### Testa anslutning:
```bash
curl -X POST http://localhost:3001/api/email/test-connection
```

## 📝 Loggar

Systemet loggar allt som händer:
- ✅ Godkända emails → Projekt skapas
- ❌ Ej godkända emails → Ignoreras  
- 📧 Email-anslutning status
- 🎯 Projekt som skapas

Kolla konsolen där servern körs för att se alla loggar.
