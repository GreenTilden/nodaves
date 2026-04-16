from pydantic import BaseModel
from enum import Enum


class BarVibe(str, Enum):
    dive = "dive"
    upscale = "upscale"
    family = "family"
    rowdy = "rowdy"
    chill = "chill"
    college = "college"


class BarBase(BaseModel):
    name: str
    address: str
    city: str
    state: str
    lat: float | None = None
    lng: float | None = None
    google_place_id: str | None = None
    vibe: BarVibe | None = None
    vibe_tags: list[str] = []
    tv_count: int | None = None
    has_sound: bool | None = None
    notes: str | None = None


class BarCreate(BarBase):
    pass


class BarUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    lat: float | None = None
    lng: float | None = None
    google_place_id: str | None = None
    vibe: BarVibe | None = None
    vibe_tags: list[str] | None = None
    tv_count: int | None = None
    has_sound: bool | None = None
    notes: str | None = None


class Bar(BarBase):
    id: str
    created_at: str
    updated_at: str
