import aiosqlite
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .config import settings

DB_PATH = Path(settings.db_path)

SCHEMA = """
CREATE TABLE IF NOT EXISTS bars (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    lat REAL,
    lng REAL,
    google_place_id TEXT,
    vibe TEXT,
    vibe_tags TEXT DEFAULT '[]',
    tv_count INTEGER,
    has_sound INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    mascot TEXT,
    sport TEXT,
    conference TEXT,
    division TEXT,
    region TEXT,
    colors TEXT DEFAULT '[]',
    logo_url TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bar_fandoms (
    id TEXT PRIMARY KEY,
    bar_id TEXT NOT NULL REFERENCES bars(id),
    team_id TEXT NOT NULL REFERENCES teams(id),
    strength TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'curator',
    confidence REAL,
    evidence TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    UNIQUE(bar_id, team_id)
);

CREATE TABLE IF NOT EXISTS city_guides (
    id TEXT PRIMARY KEY,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    bar_count INTEGER DEFAULT 0,
    top_fandoms TEXT DEFAULT '[]',
    generated_blurb TEXT,
    generated_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bars_city_state ON bars(city, state);
CREATE INDEX IF NOT EXISTS idx_bar_fandoms_bar ON bar_fandoms(bar_id);
CREATE INDEX IF NOT EXISTS idx_bar_fandoms_team ON bar_fandoms(team_id);
CREATE INDEX IF NOT EXISTS idx_city_guides_slug ON city_guides(slug);
"""


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    db = await get_db()
    try:
        await db.executescript(SCHEMA)
        await db.commit()
    finally:
        await db.close()


def new_id() -> str:
    return uuid.uuid4().hex[:12]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
