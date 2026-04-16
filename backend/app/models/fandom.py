from pydantic import BaseModel
from enum import Enum


class FandomStrength(str, Enum):
    primary = "primary"      # this bar IS a [team] bar
    secondary = "secondary"  # strong presence, not dominant
    friendly = "friendly"    # welcoming, shows games


class FandomSource(str, Enum):
    curator = "curator"      # manually added by curator
    ai = "ai"                # classified from review text
    verified = "verified"    # curator-confirmed AI classification


class BarFandomBase(BaseModel):
    bar_id: str
    team_id: str
    strength: FandomStrength
    source: FandomSource = FandomSource.curator
    confidence: float | None = None  # AI classification confidence 0-1
    evidence: list[str] = []  # review snippets or notes supporting the classification


class BarFandomCreate(BarFandomBase):
    pass


class BarFandom(BarFandomBase):
    id: str
    created_at: str
