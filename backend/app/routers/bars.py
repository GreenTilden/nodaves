import json
from fastapi import APIRouter, HTTPException, Query
from ..models import Bar, BarCreate, BarUpdate
from ..database import get_db, new_id, now_iso

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
