"""Seed bars across cities — home turf + road trip dataset.

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
    {"name": "Ohio State Buckeyes", "mascot": "Brutus", "sport": "ncaa",
     "conference": "Big Ten", "region": "Midwest", "colors": ["#BB0000", "#666666"]},
    {"name": "Michigan Wolverines", "mascot": "Wolverine", "sport": "ncaa",
     "conference": "Big Ten", "region": "Midwest", "colors": ["#00274C", "#FFCB05"]},
    {"name": "Tennessee Volunteers", "mascot": "Smokey", "sport": "ncaa",
     "conference": "SEC", "region": "Southeast", "colors": ["#FF8200", "#FFFFFF"]},
    {"name": "Alabama Crimson Tide", "mascot": "Big Al", "sport": "ncaa",
     "conference": "SEC", "region": "Southeast", "colors": ["#9E1B32", "#FFFFFF"]},
    {"name": "Chicago Bears", "mascot": "Staley", "sport": "nfl",
     "conference": "NFC North", "region": "Midwest", "colors": ["#0B162A", "#C83803"]},
    {"name": "Nashville Predators", "mascot": "Gnash", "sport": "nhl",
     "conference": "Western", "region": "Southeast", "colors": ["#FFB81C", "#041E42"]},
]

BARS = [
    # === INDIANAPOLIS (home turf) ===
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

    # === BLOOMINGTON, IN ===
    {"name": "Nick's English Hut", "address": "423 E Kirkwood Ave",
     "city": "Bloomington", "state": "IN", "lat": 39.1653, "lng": -86.5264,
     "vibe": "dive", "vibe_tags": ["historic", "campus", "sink the biz"],
     "tv_count": 6, "has_sound": True,
     "fandoms": [("Indiana Hoosiers", "primary")]},
    {"name": "Kilroy's on Kirkwood", "address": "502 E Kirkwood Ave",
     "city": "Bloomington", "state": "IN", "lat": 39.1654, "lng": -86.5254,
     "vibe": "college", "vibe_tags": ["campus", "late night", "breadsticks"],
     "tv_count": 20, "has_sound": True,
     "fandoms": [("Indiana Hoosiers", "primary")]},

    # === WEST LAFAYETTE, IN ===
    {"name": "Harry's Chocolate Shop", "address": "329 W State St",
     "city": "West Lafayette", "state": "IN", "lat": 40.4237, "lng": -86.9090,
     "vibe": "college", "vibe_tags": ["campus", "historic", "boilermakers"],
     "tv_count": 15, "has_sound": True,
     "fandoms": [("Purdue Boilermakers", "primary")]},
    {"name": "Where Else Bar", "address": "314 W State St",
     "city": "West Lafayette", "state": "IN", "lat": 40.4236, "lng": -86.9085,
     "vibe": "dive", "vibe_tags": ["campus", "cheap", "boilermakers"],
     "tv_count": 8, "has_sound": True,
     "fandoms": [("Purdue Boilermakers", "primary")]},

    # === CHICAGO, IL ===
    {"name": "Crossroads Public House", "address": "1120 W Madison St",
     "city": "Chicago", "state": "IL", "lat": 41.8816, "lng": -87.6563,
     "vibe": "upscale", "vibe_tags": ["west loop", "big ten", "alumni"],
     "tv_count": 25, "has_sound": True,
     "fandoms": [("Purdue Boilermakers", "primary")]},
    {"name": "Will's Northwoods Inn", "address": "3030 N Racine Ave",
     "city": "Chicago", "state": "IL", "lat": 41.9349, "lng": -87.6585,
     "vibe": "dive", "vibe_tags": ["lakeview", "big ten", "alumni"],
     "tv_count": 10, "has_sound": True,
     "fandoms": [("Michigan Wolverines", "primary")]},
    {"name": "The Pony Inn", "address": "1638 W Belmont Ave",
     "city": "Chicago", "state": "IL", "lat": 41.9396, "lng": -87.6698,
     "vibe": "dive", "vibe_tags": ["lakeview", "bears", "neighborhood"],
     "tv_count": 8, "has_sound": True,
     "fandoms": [("Chicago Bears", "primary")]},
    {"name": "Kirkwood Bar & Grill", "address": "2934 N Sheffield Ave",
     "city": "Chicago", "state": "IL", "lat": 41.9342, "lng": -87.6538,
     "vibe": "college", "vibe_tags": ["lakeview", "hoosiers", "alumni"],
     "tv_count": 18, "has_sound": True,
     "fandoms": [("Indiana Hoosiers", "primary")]},

    # === NASHVILLE, TN ===
    {"name": "Broadway Brewhouse", "address": "317 Broadway",
     "city": "Nashville", "state": "TN", "lat": 36.1590, "lng": -86.7756,
     "vibe": "rowdy", "vibe_tags": ["broadway", "tourists", "all teams"],
     "tv_count": 50, "has_sound": True,
     "fandoms": [("Tennessee Volunteers", "secondary"), ("Nashville Predators", "friendly")]},
    {"name": "Double Dogs", "address": "1807 21st Ave S",
     "city": "Nashville", "state": "TN", "lat": 36.1352, "lng": -86.7984,
     "vibe": "college", "vibe_tags": ["hillsboro village", "sec", "vandy area"],
     "tv_count": 30, "has_sound": True,
     "fandoms": [("Alabama Crimson Tide", "secondary"), ("Tennessee Volunteers", "friendly")]},

    # === COLUMBUS, OH ===
    {"name": "Varsity Club", "address": "278 W Lane Ave",
     "city": "Columbus", "state": "OH", "lat": 40.0044, "lng": -83.0142,
     "vibe": "college", "vibe_tags": ["campus", "gameday", "buckeyes"],
     "tv_count": 35, "has_sound": True,
     "fandoms": [("Ohio State Buckeyes", "primary")]},
    {"name": "Out-R-Inn", "address": "20 E Frambes Ave",
     "city": "Columbus", "state": "OH", "lat": 40.0028, "lng": -83.0083,
     "vibe": "dive", "vibe_tags": ["campus", "cheap pitchers", "buckeyes"],
     "tv_count": 10, "has_sound": True,
     "fandoms": [("Ohio State Buckeyes", "primary")]},

    # === LOUISVILLE, KY ===
    {"name": "Saints Pizza Pub", "address": "131 Breckenridge Ln",
     "city": "Louisville", "state": "KY", "lat": 38.2223, "lng": -85.6886,
     "vibe": "family", "vibe_tags": ["east end", "pizza", "uk vs ul"],
     "tv_count": 20, "has_sound": True,
     "fandoms": [("Indiana Hoosiers", "friendly")]},

    # === SOUTH BEND, IN ===
    {"name": "Legends of Notre Dame", "address": "100 N Notre Dame Ave",
     "city": "South Bend", "state": "IN", "lat": 41.6987, "lng": -86.2340,
     "vibe": "upscale", "vibe_tags": ["campus", "alumni", "gameday"],
     "tv_count": 25, "has_sound": True,
     "fandoms": [("Notre Dame Fighting Irish", "primary")]},
    {"name": "CJ's Pub", "address": "417 N Michigan St",
     "city": "South Bend", "state": "IN", "lat": 41.6812, "lng": -86.2489,
     "vibe": "dive", "vibe_tags": ["downtown", "irish", "local"],
     "tv_count": 10, "has_sound": True,
     "fandoms": [("Notre Dame Fighting Irish", "primary")]},
]


async def seed():
    await init_db()
    db = await get_db()
    try:
        # Seed teams
        team_ids = {}
        for t in TEAMS:
            # Check if team already exists
            cursor = await db.execute("SELECT id FROM teams WHERE name = ?", (t["name"],))
            existing = await cursor.fetchone()
            if existing:
                team_ids[t["name"]] = existing["id"]
                continue
            tid = new_id()
            team_ids[t["name"]] = tid
            await db.execute(
                """INSERT INTO teams (id, name, mascot, sport, conference,
                   division, region, colors, logo_url, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (tid, t["name"], t.get("mascot"), t.get("sport"),
                 t.get("conference"), t.get("division"), t.get("region"),
                 json.dumps(t.get("colors", [])), None, now_iso()),
            )

        # Seed bars + fandoms
        bar_count = 0
        for b in BARS:
            fandoms = b.pop("fandoms", [])
            # Check if bar already exists
            cursor = await db.execute(
                "SELECT id FROM bars WHERE name = ? AND city = ?",
                (b["name"], b["city"]),
            )
            existing = await cursor.fetchone()
            if existing:
                b["fandoms"] = fandoms  # restore for next run
                continue

            bid = new_id()
            ts = now_iso()
            await db.execute(
                """INSERT INTO bars (id, name, address, city, state, lat, lng,
                   google_place_id, vibe, vibe_tags, tv_count, has_sound, notes,
                   created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (bid, b["name"], b["address"], b["city"], b["state"],
                 b.get("lat"), b.get("lng"), None,
                 b.get("vibe"), json.dumps(b.get("vibe_tags", [])),
                 b.get("tv_count"), 1 if b.get("has_sound") else 0,
                 None, ts, ts),
            )
            bar_count += 1
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

        # Summary
        total_bars = (await (await db.execute("SELECT COUNT(*) c FROM bars")).fetchone())["c"]
        total_teams = (await (await db.execute("SELECT COUNT(*) c FROM teams")).fetchone())["c"]
        total_fandoms = (await (await db.execute("SELECT COUNT(*) c FROM bar_fandoms")).fetchone())["c"]
        cities = await (await db.execute("SELECT city, state, COUNT(*) c FROM bars GROUP BY city, state ORDER BY c DESC")).fetchall()

        print(f"\n=== SEED SUMMARY ===")
        print(f"Teams:   {total_teams}")
        print(f"Bars:    {total_bars} ({bar_count} new)")
        print(f"Fandoms: {total_fandoms}")
        print(f"\nBars by city:")
        for c in cities:
            print(f"  {c['city']}, {c['state']}: {c['c']}")

    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(seed())
