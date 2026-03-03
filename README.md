# jcd-watchlist-dashboard

MVP voor 3x per dag checken van opgegeven auto's op auc.japancardirect.com + dashboard op Vercel.

## Wat staat er nu

- Next.js app (App Router)
- Supabase schema (`supabase/schema.sql`)
- Collector endpoint: `GET /api/cars/check`
- Dashboard: `/dashboard/cars`
- Vercel cron config (`vercel.json`) met 3 checks per dag (UTC)

## Setup

1. Installeer dependencies
```bash
npm install
```

2. Zet env vars (kopieer `.env.example` naar `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` (optioneel, aanbevolen)

3. Draai SQL in Supabase:
- `supabase/schema.sql`

4. Start lokaal:
```bash
npm run dev
```

## Belangrijk

De collector draait nu op basis van **Saved Search URL's** per watchlist-item + een ingelogde cookie.

- Zet `JCD_COOKIE` in env (waarde uit je browser voor `auc.japancardirect.com`)
- Voeg in `/dashboard/watchlist` per item een `search_url` toe (bijv. `https://auc.japancardirect.com/aj_neo?s=...`)
- Run `GET /api/cars/check` (met `Authorization: Bearer <CRON_SECRET>` als je secret gebruikt)

De parser pakt listing-links (`aj-*.htm`) + basisvelden (jaar/km/yen) uit de zoekresultaatpagina.

## Aanbevolen volgende stap

- Watchlist CRUD pagina (`/dashboard/watchlist`)
- Echte JCD collector implementatie
- WhatsApp/Telegram alerts bij nieuwe hits
