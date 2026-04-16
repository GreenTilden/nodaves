import json
import math
from fastapi import APIRouter, HTTPException, Query
from ..models import Bar, BarCreate, BarUpdate
from ..database import get_db, new_id, now_iso

EARTH_RADIUS_MI = 3959.0

router = APIRouter(prefix="/bars", tags=["bars"])


@router.get("/", response_model=list[Bar])
async def list_bars(
    city: str | None = None,
    state: str | None = None,
    team: str | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    db = await get_db()
    try:
        if team:
            query = """
                SELECT b.* FROM bars b
                JOIN bar_fandoms bf ON b.id = bf.bar_id
                JOIN teams t ON bf.team_id = t.id
                WHERE t.name = ?
            """
            params: list = [team]
            if city:
                query += " AND b.city = ?"
                params.append(city)
            if state:
                query += " AND b.state = ?"
                params.append(state)
            query += " ORDER BY bf.strength ASC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
        else:
            query = "SELECT * FROM bars WHERE 1=1"
            params = []
            if city:
                query += " AND city = ?"
                params.append(city)
            if state:
                query += " AND state = ?"
                params.append(state)
            query += " ORDER BY name LIMIT ? OFFSET ?"
            params.extend([limit, offset])

        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [_row_to_bar(r) for r in rows]
    finally:
        await db.close()


@router.post("/", response_model=Bar, status_code=201)
async def create_bar(bar: BarCreate):
    db = await get_db()
    try:
        bar_id = new_id()
        ts = now_iso()
        await db.execute(
            """INSERT INTO bars (id, name, address, city, state, lat, lng,
               google_place_id, vibe, vibe_tags, tv_count, has_sound, notes,
               created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (bar_id, bar.name, bar.address, bar.city, bar.state,
             bar.lat, bar.lng, bar.google_place_id,
             bar.vibe.value if bar.vibe else None,
             json.dumps(bar.vibe_tags), bar.tv_count,
             1 if bar.has_sound else (0 if bar.has_sound is not None else None),
             bar.notes, ts, ts),
        )
        await db.commit()
        return Bar(id=bar_id, created_at=ts, updated_at=ts, **bar.model_dump())
    finally:
        await db.close()


@router.get("/nearby")
async def nearby_bars(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
    team: str | None = Query(None, description="Filter by team name"),
    radius: float = Query(default=50, le=500, description="Search radius in miles"),
    limit: int = Query(default=20, le=100),
):
    db = await get_db()
    try:
        lat_rad = math.radians(lat)
        lng_rad = math.radians(lng)
        lat_delta = radius / 69.0
        lng_delta = radius / (69.0 * max(math.cos(lat_rad), 0.01))

        if team:
            query = """
                SELECT b.*,
                    bf.strength AS fandom_strength,
                    bf.source AS fandom_source,
                    t.name AS team_name,
                    t.colors AS team_colors,
                    (? * ACOS(
                        MIN(1.0, COS(?) * COS(RADIANS(b.lat)) *
                        COS(RADIANS(b.lng) - ?) +
                        SIN(?) * SIN(RADIANS(b.lat)))
                    )) AS distance_mi
                FROM bars b
                JOIN bar_fandoms bf ON b.id = bf.bar_id
                JOIN teams t ON bf.team_id = t.id
                WHERE t.name = ?
                  AND b.lat BETWEEN ? AND ?
                  AND b.lng BETWEEN ? AND ?
                  AND b.lat IS NOT NULL
                ORDER BY fandom_strength ASC, distance_mi ASC
                LIMIT ?
            """
            params: list = [
                EARTH_RADIUS_MI, lat_rad, lng_rad, lat_rad,
                team,
                lat - lat_delta, lat + lat_delta,
                lng - lng_delta, lng + lng_delta,
                limit,
            ]
        else:
            query = """
                SELECT b.*,
                    NULL AS fandom_strength,
                    NULL AS fandom_source,
                    NULL AS team_name,
                    NULL AS team_colors,
                    (? * ACOS(
                        MIN(1.0, COS(?) * COS(RADIANS(b.lat)) *
                        COS(RADIANS(b.lng) - ?) +
                        SIN(?) * SIN(RADIANS(b.lat)))
                    )) AS distance_mi
                FROM bars b
                WHERE b.lat BETWEEN ? AND ?
                  AND b.lng BETWEEN ? AND ?
                  AND b.lat IS NOT NULL
                ORDER BY distance_mi ASC
                LIMIT ?
            """
            params = [
                EARTH_RADIUS_MI, lat_rad, lng_rad, lat_rad,
                lat - lat_delta, lat + lat_delta,
                lng - lng_delta, lng + lng_delta,
                limit,
            ]

        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        results = []
        for row in rows:
            bar = {
                "id": row["id"], "name": row["name"],
                "address": row["address"], "city": row["city"], "state": row["state"],
                "lat": row["lat"], "lng": row["lng"], "vibe": row["vibe"],
                "vibe_tags": json.loads(row["vibe_tags"]) if row["vibe_tags"] else [],
                "tv_count": row["tv_count"],
                "has_sound": bool(row["has_sound"]) if row["has_sound"] is not None else None,
                "distance_mi": round(row["distance_mi"], 1) if row["distance_mi"] else None,
                "dave_score": _compute_dave_score(row),
            }
            if row["team_name"]:
                bar["fandom"] = {
                    "team": row["team_name"], "strength": row["fandom_strength"],
                    "source": row["fandom_source"],
                    "colors": json.loads(row["team_colors"]) if row["team_colors"] else [],
                }
            results.append(bar)

        return {"bars": results, "count": len(results),
                "center": {"lat": lat, "lng": lng}, "radius_mi": radius, "team_filter": team}
    finally:
        await db.close()


@router.get("/graph")
async def bar_fandom_graph():
    db = await get_db()
    try:
        teams_rows = await (await db.execute(
            "SELECT id, name, colors FROM teams ORDER BY name")).fetchall()
        bars_rows = await (await db.execute(
            "SELECT id, name, city, state, vibe FROM bars ORDER BY name")).fetchall()
        fandom_rows = await (await db.execute(
            "SELECT bar_id, team_id, strength FROM bar_fandoms")).fetchall()

        nodes = []
        for t in teams_rows:
            nodes.append({"id": t["id"], "label": t["name"], "group": "team",
                          "size": 20, "colors": json.loads(t["colors"]) if t["colors"] else []})
        for b in bars_rows:
            nodes.append({"id": b["id"], "label": b["name"], "group": "bar",
                          "size": 8, "meta": f"{b['city']}, {b['state']}"})

        links = []
        strength_weight = {"primary": 3, "secondary": 2, "friendly": 1}
        for f in fandom_rows:
            links.append({"source": f["bar_id"], "target": f["team_id"],
                          "weight": strength_weight.get(f["strength"], 1), "label": f["strength"]})

        # Chord matrix: team co-occurrence via shared city
        team_list = [t["name"] for t in teams_rows]
        team_id_map = {t["id"]: t["name"] for t in teams_rows}
        matrix = [[0] * len(team_list) for _ in range(len(team_list))]
        bars_by_city: dict[str, set] = {}
        for f in fandom_rows:
            for b in bars_rows:
                if b["id"] == f["bar_id"]:
                    key = f"{b['city']},{b['state']}"
                    bars_by_city.setdefault(key, set()).add(team_id_map.get(f["team_id"], ""))
                    break
        for city_teams in bars_by_city.values():
            ctl = [t for t in city_teams if t in team_list]
            for i, t1 in enumerate(ctl):
                for t2 in ctl[i + 1:]:
                    i1, i2 = team_list.index(t1), team_list.index(t2)
                    matrix[i1][i2] += 1
                    matrix[i2][i1] += 1

        return {"nodes": nodes, "links": links, "chord": {"labels": team_list, "matrix": matrix}}
    finally:
        await db.close()


@router.get("/{bar_id}", response_model=Bar)
async def get_bar(bar_id: str):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM bars WHERE id = ?", (bar_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Bar not found")
        return _row_to_bar(row)
    finally:
        await db.close()


@router.patch("/{bar_id}", response_model=Bar)
async def update_bar(bar_id: str, update: BarUpdate):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM bars WHERE id = ?", (bar_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Bar not found")

        changes = update.model_dump(exclude_unset=True)
        if not changes:
            return _row_to_bar(row)

        sets = []
        params = []
        for k, v in changes.items():
            if k == "vibe" and v is not None:
                v = v.value
            elif k == "vibe_tags":
                v = json.dumps(v)
            elif k == "has_sound" and v is not None:
                v = 1 if v else 0
            sets.append(f"{k} = ?")
            params.append(v)

        sets.append("updated_at = ?")
        ts = now_iso()
        params.append(ts)
        params.append(bar_id)

        await db.execute(f"UPDATE bars SET {', '.join(sets)} WHERE id = ?", params)
        await db.commit()

        cursor = await db.execute("SELECT * FROM bars WHERE id = ?", (bar_id,))
        return _row_to_bar(await cursor.fetchone())
    finally:
        await db.close()


def _row_to_bar(row) -> Bar:
    return Bar(
        id=row["id"],
        name=row["name"],
        address=row["address"],
        city=row["city"],
        state=row["state"],
        lat=row["lat"],
        lng=row["lng"],
        google_place_id=row["google_place_id"],
        vibe=row["vibe"],
        vibe_tags=json.loads(row["vibe_tags"]) if row["vibe_tags"] else [],
        tv_count=row["tv_count"],
        has_sound=bool(row["has_sound"]) if row["has_sound"] is not None else None,
        notes=row["notes"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _compute_dave_score(row) -> int:
    """Dave Score (0-100). Lower = real fans. Higher = Dave territory."""
    score = 50
    strength = row["fandom_strength"] if "fandom_strength" in row.keys() else None
    if strength == "primary":
        score -= 25
    elif strength == "secondary":
        score -= 10
    elif strength == "friendly":
        score += 5
    elif strength is None:
        score += 20

    vibe = row["vibe"]
    if vibe == "dive":
        score -= 10
    elif vibe == "college":
        score -= 5
    elif vibe == "rowdy":
        score += 15
    elif vibe == "upscale":
        score += 5

    tv_count = row["tv_count"] or 0
    if tv_count >= 30:
        score -= 10
    elif tv_count >= 15:
        score -= 5
    elif tv_count < 5:
        score += 10

    if row["has_sound"]:
        score -= 5

    return max(0, min(100, score))
