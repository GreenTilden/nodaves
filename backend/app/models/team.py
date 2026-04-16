from pydantic import BaseModel


class TeamBase(BaseModel):
    name: str
    mascot: str | None = None
    sport: str | None = None  # football, basketball, baseball, hockey, soccer, etc.
    conference: str | None = None  # Big Ten, SEC, NFL AFC South, etc.
    division: str | None = None
    region: str | None = None  # e.g. "Midwest", "Southeast"
    colors: list[str] = []  # hex codes
    logo_url: str | None = None


class TeamCreate(TeamBase):
    pass


class Team(TeamBase):
    id: str
    created_at: str
