# No Daves

Find your fandom's bar in any city. Curator-driven sports bar database with AI-assisted fandom classification from review text. Barry (DWAVE pixel mascot) hosts and curates.

## Agent Identity
- **Name**: No Daves (nodaves.com)
- **Division**: DTAPE / DWAVE — 100% validation sprint ownership
- **Reports To**: Darren Arney
- **Responsibilities**: Sports bar fandom database, city guide generation, content pipeline, darn3 visualizations
- **UI**: Desktop only. No mobile responsiveness. No blurbs.

## Architecture

```
home-bar-advantage/
├── backend/           ← FastAPI (port 8907), SQLite, Ollama integration
│   ├── app/
│   │   ├── models/    ← Bar, Team, BarFandom, CityGuide (Pydantic)
│   │   ├── routers/   ← health, bars, teams, fandoms, cities
│   │   ├── services/  ← content generation, fandom classification
│   │   ├── sources/   ← Google Places adapter, review scrapers
│   │   └── data/      ← seed data, classification prompts
│   └── scripts/       ← seed_indy.py, autoresearch adapter
├── frontend/          ← Vue 3 + TypeScript + Vite (port 5015)
│   └── src/
│       ├── lib/darn3/ ← DArnTech D3 visualization library (copied from darntech)
│       ├── pages/     ← Home, City, Bar, Teams
│       └── composables/
└── adapter/           ← Autoresearch harness adapter for overnight batch classification
```

## Brand
- **Barry** = your scout. Pixel mascot from DWAVE. Finds your fandom's bars.
- **Dave** = the anti-signal. Never shown, only referenced. The loud guy in a Barstool shirt ruining the vibe. High Dave Score = touristy/generic. Low Dave Score = real fandom territory.
- **Tagline**: "Dave's not here. Your team is."
- **Domain**: nodaves.com (A record → 47.227.64.28 → CT 100 nginx)

## Ports
- **Frontend dev**: localhost:5015
- **Backend dev**: localhost:8907
- **Prod**: nodaves.com (CT 100, /var/www/nodaves/)

## Development

```bash
# Backend
cd backend && pip install -r requirements.txt
python -m scripts.seed_indy          # seed Indianapolis data
uvicorn app.main:app --port 8907 --reload

# Frontend
cd frontend && npm install && npm run dev
```

## Data Model

- **Bar**: name, address, city, state, lat/lng, vibe, tv_count, has_sound
- **Team**: name, mascot, sport, conference, region, colors
- **BarFandom**: bar→team link with strength (primary/secondary/friendly), source (curator/ai/verified)
- **CityGuide**: city overview with top fandoms, Barry-voiced blurb, bar count

## Content Pipeline

1. Curator seeds bars manually (Indy is home turf dataset)
2. Google Places API pulls reviews per bar (overnight batch)
3. Ollama classifies fandom signals from review text
4. Barry character generates city guide blurbs
5. darn3 visualizations: fandom heatmaps, rivalry chord diagrams, territory maps
6. Auto-generated per-city pages for SEO + social content

## API Routing

| Path | Backend |
|------|---------|
| `/api/health` | Health check |
| `/api/bars` | Bar CRUD + search by city/team |
| `/api/teams` | Team listing |
| `/api/fandoms` | Bar↔Team fandom links |
| `/api/cities` | City guide CRUD |

## Key Dependencies
- darn3 visualization library (copied from darntech/src/lib/darn3/)
- Barry sprite assets (from dwave/public/icons/)
- Ollama on Node 1 (192.168.0.99:11434) for fandom classification
- Autoresearch harness pattern for overnight batch runs
