# VinIverdagen — Oppsettsguide

En vinklubb-app bygget med Next.js, Supabase og Vinmonopolets API.

## Hva du får

- E-post/passord-innlogging med manuell godkjenning
- Klubbkvelder med dato, tema, sted, oppmøte og bilde
- Vin-oppslag mot Vinmonopolet (auto-søk på navn/varenummer)
- Score 1-10 og kommentarer per smaking (kan ikke endres/slettes)
- Vinliste med filter på kategori og score
- Statistikk: topp 10 totalt, per kategori, land og drue
- Admin-panel for medlemsgodkjenning og klubbkvelder
- Daglig synkronisering av Vinmonopolets katalog

## Forutsetninger

Du trenger:
- En datamaskin med Node.js installert ([nodejs.org](https://nodejs.org/) — last ned LTS)
- Konto på [Supabase](https://supabase.com) (du har)
- Konto på [Vercel](https://vercel.com) (gratis — opprettes i steg 5)
- Konto på [Vinmonopolets API-portal](https://api.vinmonopolet.no) (gratis)
- En Git-konto (GitHub anbefales — gratis)

---

## Steg 1 — Sett opp Supabase

1. Logg inn på [supabase.com](https://supabase.com) og opprett et nytt prosjekt.
   - Navn: `viniverdagen`
   - Velg en sterk database-passord (lagre det)
   - Region: velg `Europe (Frankfurt)` for raskest tilgang fra Norge

2. Når prosjektet er klart, gå til **SQL Editor** i venstremenyen.

3. Åpne filen `supabase/migrations/001_init.sql` fra prosjektet, kopier hele innholdet, lim inn i SQL Editor og trykk **Run**.

4. Gå til **Settings → API** og kopier disse verdiene (du trenger dem snart):
   - `Project URL`
   - `anon public` nøkkel
   - `service_role` nøkkel (under "Project API keys" — klikk "Reveal")

5. Gå til **Authentication → Providers → Email** og slå AV "Confirm email" hvis du vil at folk skal kunne logge inn umiddelbart. Husk at de uansett må godkjennes manuelt av deg.

---

## Steg 2 — Hent Vinmonopolet API-nøkkel

1. Gå til [api.vinmonopolet.no](https://api.vinmonopolet.no).
2. Klikk **Sign Up** øverst til høyre og opprett konto.
3. Etter innlogging: gå til **Products** → velg **Open** → klikk **Subscribe**.
4. Aksepter vilkårene.
5. Gå til **Profile** → kopier **Primary key** (det er din API-nøkkel).

---

## Steg 3 — Last ned koden lokalt

1. Pakk ut zip-filen jeg leverte til en mappe, f.eks. `~/viniverdagen`.
2. Åpne en terminal i mappen.
3. Kjør:
   ```bash
   npm install
   ```

4. Kopier `.env.example` til `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

5. Åpne `.env.local` og fyll inn verdiene fra steg 1 og 2:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   VINMONOPOLET_API_KEY=din-nokkel
   CRON_SECRET=lag-en-tilfeldig-streng-her
   ```
   For `CRON_SECRET` kan du bruke en passord-generator (16+ tegn).

6. Test lokalt:
   ```bash
   npm run dev
   ```
   Åpne [http://localhost:3000](http://localhost:3000). Du skulle se loginsiden.

---

## Steg 4 — Opprett din admin-bruker

1. Gå til [http://localhost:3000/signup](http://localhost:3000/signup) og registrer deg med din egen e-post.
2. Åpne Supabase, gå til **Table Editor → medlemmer**.
3. Finn din rad og sett:
   - `godkjent` = `true`
   - `er_admin` = `true`
4. Logg inn på [http://localhost:3000/login](http://localhost:3000/login).

---

## Steg 5 — Først synkronisering av Vinmonopol-data

Vinmonopolet har ca. 30 000 produkter. Første synk tar ~10 minutter.

Mens du kjører lokalt, åpne en ny terminal og kjør:

```bash
curl -H "Authorization: Bearer DIN_CRON_SECRET" http://localhost:3000/api/cron/sync-vinmonopolet
```

Bytt ut `DIN_CRON_SECRET` med verdien du satte i `.env.local`.

Du kan også sjekke fremgangen i Supabase under **Table Editor → vinmonopol_produkter**. Antall rader øker etter hvert.

> **Tips:** Hvis Vinmonopolets API-format avviker fra det jeg har antatt i `lib/vinmonopolet.ts`, kan synkroniseringen feile. I så fall: åpne `lib/vinmonopolet.ts` og juster `mapProdukt`-funksjonen basert på det faktiske API-svaret. Du kan se rådata ved å kalle API-et manuelt:
> ```
> curl -H "Ocp-Apim-Subscription-Key: DIN_NOKKEL" "https://apis.vinmonopolet.no/products/v0/details-normal?maxResults=1"
> ```

---

## Steg 6 — Deploy til Vercel

1. Opprett en Git-repo på GitHub (privat anbefales) og push koden:
   ```bash
   git init
   git add .
   git commit -m "Første versjon"
   git branch -M main
   git remote add origin git@github.com:DITT-BRUKERNAVN/viniverdagen.git
   git push -u origin main
   ```

2. Gå til [vercel.com](https://vercel.com), logg inn med GitHub.

3. Klikk **Add New → Project** → velg `viniverdagen`-repoet → **Import**.

4. Under **Environment Variables**, legg til alle verdiene fra `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VINMONOPOLET_API_KEY`
   - `CRON_SECRET`

5. Klikk **Deploy**.

6. Etter ~1 minutt får du URL-en `viniverdagen.vercel.app`.

7. Den daglige synkroniseringen kjører automatisk hver natt kl. 06 norsk tid via `vercel.json`.

---

## Steg 7 — Legg inn historiske klubbkvelder

1. Logg inn som admin.
2. Gå til **Admin → Ny klubbkveld**.
3. For hver av de 8 kveldene, fyll inn dato (kan være i fortiden), tittel, sted, oppmøtte og evt. bilde.
4. Inviter medlemmene til å registrere seg via `viniverdagen.vercel.app/signup`.
5. Godkjenn dem fra **Admin → Medlemmer**.
6. De kan nå legge inn vinene de tok med på de respektive kveldene.

---

## Vanlige problemer

**"Vinmonopolet API feilet: 401"**  
Sjekk at `VINMONOPOLET_API_KEY` er riktig satt i Vercel og lokalt.

**"Kontoen din er ikke godkjent ennå"**  
Du må godkjenne medlemmer manuelt fra Admin-panelet.

**Søk i Vinmonopolet returnerer ingenting**  
Den daglige synkroniseringen har ikke kjørt enda. Trigg den manuelt med curl-kommandoen fra steg 5.

**Trenger hjelp?**  
Database-skjemaet ligger i `supabase/migrations/001_init.sql`. Alle filer er TypeScript/React og kan endres etter behov.

---

## Mappestruktur

```
viniverdagen/
├── app/                    # Sider (Next.js App Router)
│   ├── api/                # API-endepunkter
│   ├── login/, signup/     # Innlogging
│   ├── klubbkvelder/       # Klubbkvelder-sider
│   ├── viner/              # Vin-sider
│   ├── statistikk/         # Statistikkside
│   └── admin/              # Admin-panel
├── components/             # React-komponenter
├── lib/                    # Hjelpefunksjoner (Supabase, Vinmonopolet)
├── supabase/migrations/    # SQL-skjema
└── vercel.json             # Cron-konfigurasjon
```

Lykke til! 🍷
