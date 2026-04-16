"""Seed Indianapolis bars — the home turf dataset.

Run from backend/: python -m scripts.seed_indy
"""
import asyncio
import json
from app.database import init_db, get_db, new_id, now_iso


TEAMS = [
    {"name": "Purdue Boilermakers", "mascot": "Purdue Pete", "sport": "ncaa",
     "conference": "Big Ten", "region": "Midwest", "colors": ["#CEB888", "#000000"]},
    {"name": "Indiana Hoosiers", "mascot": "Hoosier", "sport": "ncaa",
     "conference": "Big Ten", "region": "Midwest", "colors": ["#990000", "#FFFFFF"]},
    {"name": "Notre Dame Fighting Irish", "mascot": "Leprechaun", "sport": "ncaa",
     "conference": "Independent", "region": "Midwest", "colors": ["#0C2340", "#C99700"]},
    {"name": "Butler Bulldogs", "mascot": "Blue", "sport": "ncaa",
     "conference": "Big East", "region": "Midwest", "colors": ["#13294B", "#FFFFFF"]},
    {"name": "Indianapolis Colts", "mascot": "Blue", "sport": "nfl",
     "conference": "AFC South", "region": "Midwest", "colors": ["#002C5F", "#FFFFFF"]},
    {"name": "Indiana Pacers", "mascot": "Boomer", "sport": "nba",
     "conference": "Eastern", "region": "Midwest", "colors": ["#002D62", "#FDBB30"]},
    {"name": "Indiana Fever", "mascot": "Freddy", "sport": "wnba",
     "conference": "Eastern", "region": "Midwest", "colors": ["#E03A3E", "#FFB81C"]},
]

BARS = [
    {"name": "Brothers Bar & Grill", "address": "120 W Maryland St",
     "city": "Indianapolis", "state": "IN", "lat": 39.7667, "lng": -86.1586,
     "vibe": "college", "vibe_tags": ["big ten", "gameday", "downtown"],
     "tv_count": 40, "has_sound": True,
     "fandoms": [("Purdue Boilermakers", "primary")]},
    {"name": "Kilroy's Bar & Grill", "address": "201 S Meridian St",
     "city": "Indianapolis", "state": "IN", "lat": 39.7649, "lng": -86.1580,
     "vibe": "college", "vibe_tags": ["big ten", "late night", "downtown"],
     "tv_count": 30, "has_sound": True,
     "fandoms": [("Indiana Hoosiers", "primary")]},
    {"name": "The Slippery Noodle Inn", "address": "372 S Meridian St",
     "city": "Indianapolis", "state": "IN", "lat": 39.7613, "lng": -86.1580,
     "vibe": "dive", "vibe_tags": ["blues", "historic", "colts pregame"],
     "tv_count": 8, "has_sound": False,
     "fandoms": [("Indianapolis Colts", "secondary")]},
    {"name": "Union Jack Pub", "address": "924 Broad Ripple Ave",
     "city": "Indianapolis", "state": "IN", "lat": 39.8686, "lng": -86.1413,
     "vibe": "chill", "vibe_tags": ["soccer", "broad ripple", "patio"],
     "tv_count": 15, "has_sound": True,
     "fandoms": []},
    {"name": "Chatham Tap", "address": "719 Massachusetts Ave",
     "city": "Indianapolis", "state": "IN", "lat": 39.7740, "lng": -86.1485,
     "vibe": "upscale", "vibe_tags": ["mass ave", "craft beer", "premier league"],
     "tv_count": 20, "has_sound": True,
     "fandoms": [("Notre Dame Fighting Irish", "friendly")]},
    {"name": "Coaches", "address": "5645 N Illinois St",
     "city": "Indianapolis", "state": "IN", "lat": 39.8343, "lng": -86.1596,
     "vibe": "dive", "vibe_tags": ["butler", "neighborhood", "cheap beer"],
     "tv_count": 12, "has_sound": True,
     "fandoms": [("Butler Bulldogs", "primary")]},
]


async def seed():
    await init_db()
    db = await get_db()
    try:
        # Seed teams
        team_ids = {}
        for t in TEAMS:
            tid = new_id()
            team_ids[t["name"]] = tid
            await db.execute(
                """INSERT OR IGNORE INTO teams (id, name, mascot, sport, conference,
                   division, region, colors, logo_url, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (tid, t["name"], t.get("mascot"), t.get("sport"),
                 t.get("conference"), t.get("division"), t.get("region"),
                 json.dumps(t.get("colors", [])), None, now_iso()),
            )

        # Seed bars + fandoms
        for b in BARS:
            fandoms = b.pop("fandoms", [])
            bid = new_id()
            ts = now_iso()
            await db.execute(
                """INSERT OR IGNORE INTO bars (id, name, address, city, state, lat, lng,
                   google_place_id, vibe, vibe_tags, tv_count, has_sound, notes,
                   created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (bid, b["name"], b["address"], b["city"], b["state"],
                 b.get("lat"), b.get("lng"), None,
                 b.get("vibe"), json.dumps(b.get("vibe_tags", [])),
                 b.get("tv_count"), 1 if b.get("has_sound") else 0,
                 None, ts, ts),
            )
            for team_name, strength in fandoms:
                if team_name in team_ids:
                    await db.execute(
                        """INSERT OR IGNORE INTO bar_fandoms
                           (id, bar_id, team_id, strength, source, confidence, evidence, created_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                        (new_id(), bid, team_ids[team_name], strength,
                         "curator", None, "[]", ts),
                    )

        await db.commit()
        print(f"Seeded {len(TEAMS)} teams, {len(BARS)} bars")
    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(seed())
