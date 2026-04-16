import json
from fastapi import APIRouter, HTTPException
from ..models import Team, TeamCreate
from ..database import get_db, new_id, now_iso

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("/", response_model=list[Team])
async def list_teams(sport: str | None = None, conference: str | None = None):
    db = await get_db()
    try:
        query = "SELECT * FROM teams WHERE 1=1"
        params: list = []
        if sport:
            query += " AND sport = ?"
            params.append(sport)
        if conference:
            query += " AND conference = ?"
            params.append(conference)
        query += " ORDER BY name"
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [_row_to_team(r) for r in rows]
    finally:
        await db.close()


@router.post("/", response_model=Team, status_code=201)
async def create_team(team: TeamCreate):
    db = await get_db()
    try:
        team_id = new_id()
        ts = now_iso()
        await db.execute(
            """INSERT INTO teams (id, name, mascot, sport, conference, division,
               region, colors, logo_url, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (team_id, team.name, team.mascot, team.sport, team.conference,
             team.division, team.region, json.dumps(team.colors),
             team.logo_url, ts),
        )
        await db.commit()
        return Team(id=team_id, created_at=ts, **team.model_dump())
    finally:
        await db.close()


@router.get("/{team_id}", response_model=Team)
async def get_team(team_id: str):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM teams WHERE id = ?", (team_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Team not found")
        return _row_to_team(row)
    finally:
        await db.close()


def _row_to_team(row) -> Team:
    return Team(
        id=row["id"],
        name=row["name"],
        mascot=row["mascot"],
        sport=row["sport"],
        conference=row["conference"],
        division=row["division"],
        region=row["region"],
        colors=json.loads(row["colors"]) if row["colors"] else [],
        logo_url=row["logo_url"],
        created_at=row["created_at"],
    )
