from pydantic import BaseModel


class CityGuideBase(BaseModel):
    city: str
    state: str
    slug: str  # url-friendly: "indianapolis-in", "nashville-tn"
    bar_count: int = 0
    top_fandoms: list[str] = []  # team names with strongest presence
    generated_blurb: str | None = None  # Barry-voiced city overview
    generated_at: str | None = None


class CityGuideCreate(CityGuideBase):
    pass


class CityGuide(CityGuideBase):
    id: str
    created_at: str
    updated_at: str
