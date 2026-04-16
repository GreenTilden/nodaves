# No Daves — Memory

## Session Status
- **Status**: GREEN — initial scaffold complete
- **Focus**: Project bootstrapped with FastAPI backend + Vue 3 frontend + darn3 lib + Barry sprite
- **Blockers**: None — greenfield
- **Next Steps**: Seed data verification, autoresearch adapter, Casey-Jr registration, first content pipeline test
- **Last Updated**: 2026-04-15

## Project Identity
- **Name**: No Daves (nodaves.com)
- **Repo**: ~/projects/home-bar-advantage
- **Stack**: FastAPI + Vue 3/TypeScript/Vite + SQLite + darn3 + Ollama
- **Ports**: frontend 5015, backend 8907
- **Deploy Target**: nodaves.com (CT 100, /var/www/nodaves/)
- **Casey-Jr ID**: bfe16f0a
- **Dewey vehicle**: consolidation-phase project assembling existing DArnTech capabilities

## Architecture & Patterns
- FastAPI async lifespan pattern (matches darnometer/grescendo)
- SQLite with aiosqlite (WAL mode, foreign keys)
- Pydantic v2 models for all entities
- Vue 3 composable pattern: useBars() wraps all data fetching
- darn3 visualization library copied from darntech (13 chart types, theme-aware)
- Barry (DWAVE pixel mascot) as curator persona
- Autoresearch adapter pattern for overnight fandom classification batches
- Press Start 2P font + DWAVE color palette (#0d0d14 bg, #ffaa00 accent)

## Dependencies
- → depends-on: darntech (darn3 lib source)
- → depends-on: dwave (Barry sprite assets, brand identity)
- → depends-on: autoresearch-harness (adapter pattern for batch classification)
- → depends-on: Node 1 Ollama (192.168.0.99:11434) for LLM classification

## Decisions
- No user accounts, no UGC — curator-driven data model
- Fandom classification via AI (Ollama) from Google Places review text, not user votes
- Barry character hosts/curates — shared DWAVE brand universe
- darn3 visualizations are content (shareable, embeddable) — not just dashboard chrome
- Auto-generated city pages for SEO + social content pipeline
- Hidden commercial dev playground — proves DArnTech stack end-to-end
