import json
from fastapi import APIRouter, HTTPException
from ..models import CityGuide, CityGuideCreate
from ..database import get_db, new_id, now_iso

router = APIRouter(prefix="/cities", tags=["cities"])


@router.get("/", response_model=list[CityGuide])
async def list_cities():
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM city_guides ORDER BY city"
        )
        rows = await cursor.fetchall()
        return [_row_to_guide(r) for r in rows]
    finally:
        await db.close()


@router.get("/{slug}", response_model=CityGuide)
async def get_city(slug: str):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM city_guides WHERE slug = ?", (slug,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "City guide not found")
        return _row_to_guide(row)
    finally:
        await db.close()


@router.post("/", response_model=CityGuide, status_code=201)
async def create_city(guide: CityGuideCreate):
    db = await get_db()
    try:
        guide_id = new_id()
        ts = now_iso()
        await db.execute(
            """INSERT INTO city_guides (id, city, state, slug, bar_count,
               top_fandoms, generated_blurb, generated_at, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (guide_id, guide.city, guide.state, guide.slug, guide.bar_count,
             json.dumps(guide.top_fandoms), guide.generated_blurb,
             guide.generated_at, ts, ts),
        )
        await db.commit()
        return CityGuide(id=guide_id, created_at=ts, updated_at=ts, **guide.model_dump())
    finally:
        await db.close()


def _row_to_guide(row) -> CityGuide:
    return CityGuide(
        id=row["id"],
        city=row["city"],
        state=row["state"],
        slug=row["slug"],
        bar_count=row["bar_count"],
        top_fandoms=json.loads(row["top_fandoms"]) if row["top_fandoms"] else [],
        generated_blurb=row["generated_blurb"],
        generated_at=row["generated_at"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )
