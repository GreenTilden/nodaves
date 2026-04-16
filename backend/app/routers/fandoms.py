import json
from fastapi import APIRouter, HTTPException
from ..models import BarFandom, BarFandomCreate
from ..database import get_db, new_id, now_iso

router = APIRouter(prefix="/fandoms", tags=["fandoms"])


@router.get("/bar/{bar_id}", response_model=list[BarFandom])
async def get_bar_fandoms(bar_id: str):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM bar_fandoms WHERE bar_id = ? ORDER BY strength", (bar_id,)
        )
        rows = await cursor.fetchall()
        return [_row_to_fandom(r) for r in rows]
    finally:
        await db.close()


@router.get("/team/{team_id}", response_model=list[BarFandom])
async def get_team_bars(team_id: str):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM bar_fandoms WHERE team_id = ? ORDER BY strength", (team_id,)
        )
        rows = await cursor.fetchall()
        return [_row_to_fandom(r) for r in rows]
    finally:
        await db.close()


@router.post("/", response_model=BarFandom, status_code=201)
async def create_fandom(fandom: BarFandomCreate):
    db = await get_db()
    try:
        fandom_id = new_id()
        ts = now_iso()
        await db.execute(
            """INSERT INTO bar_fandoms (id, bar_id, team_id, strength, source,
               confidence, evidence, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (fandom_id, fandom.bar_id, fandom.team_id,
             fandom.strength.value, fandom.source.value,
             fandom.confidence, json.dumps(fandom.evidence), ts),
        )
        await db.commit()
        return BarFandom(id=fandom_id, created_at=ts, **fandom.model_dump())
    finally:
        await db.close()


@router.delete("/{fandom_id}", status_code=204)
async def delete_fandom(fandom_id: str):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM bar_fandoms WHERE id = ?", (fandom_id,)
        )
        if not await cursor.fetchone():
            raise HTTPException(404, "Fandom link not found")
        await db.execute("DELETE FROM bar_fandoms WHERE id = ?", (fandom_id,))
        await db.commit()
    finally:
        await db.close()


def _row_to_fandom(row) -> BarFandom:
    return BarFandom(
        id=row["id"],
        bar_id=row["bar_id"],
        team_id=row["team_id"],
        strength=row["strength"],
        source=row["source"],
        confidence=row["confidence"],
        evidence=json.loads(row["evidence"]) if row["evidence"] else [],
        created_at=row["created_at"],
    )
