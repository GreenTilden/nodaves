"""Autoresearch adapter for fandom classification tuning.

Plugs into the autoresearch-harness to optimize Ollama prompt parameters
for classifying sports bar review text into fandom affiliations.

Usage with harness:
    python -m harness.cli configs/hba_fandom.json -n 50

The adapter:
1. Varies prompt template, temperature, and classification thresholds
2. Runs Ollama against a labeled test set of review snippets
3. Evaluates accuracy of fandom detection (precision + recall)
"""

import json
import subprocess
from pathlib import Path
from typing import Any

# When wired into autoresearch-harness, uncomment:
# from harness.adapter import ExperimentAdapter

# For now, define the interface inline so the file is standalone
from abc import ABC, abstractmethod


class ExperimentAdapter(ABC):
    @abstractmethod
    def get_parameter_space(self) -> dict[str, dict]: ...
    @abstractmethod
    def get_baseline_params(self) -> dict[str, Any]: ...
    @abstractmethod
    def apply_params(self, params: dict[str, Any]) -> None: ...
    @abstractmethod
    def run_experiment(self) -> dict[str, Any]: ...
    @abstractmethod
    def evaluate(self, output: dict[str, Any]) -> float: ...
    @abstractmethod
    def reset(self) -> None: ...
    @abstractmethod
    def describe_params(self, params: dict[str, Any]) -> str: ...


# Labeled test set — reviews with known fandom signals
TEST_REVIEWS = [
    {"text": "Great spot to watch Purdue games! Boiler Up! Wall of Purdue memorabilia.",
     "expected_team": "Purdue Boilermakers", "expected_strength": "primary"},
    {"text": "We always come here for IU watch parties. Go Hoosiers!",
     "expected_team": "Indiana Hoosiers", "expected_strength": "primary"},
    {"text": "Nice sports bar, good wings. They'll put on any game if you ask.",
     "expected_team": None, "expected_strength": None},
    {"text": "Tons of TVs, Colts flags everywhere on Sundays. Great pregame spot.",
     "expected_team": "Indianapolis Colts", "expected_strength": "primary"},
    {"text": "Decent bar, saw a few Notre Dame fans but mostly neutral crowd.",
     "expected_team": "Notre Dame Fighting Irish", "expected_strength": "friendly"},
]


class FandomClassifierAdapter(ExperimentAdapter):
    """Tune Ollama prompt params for fandom classification accuracy."""

    def __init__(self):
        self.ollama_url = "http://192.168.0.99:11434"
        self.current_params: dict[str, Any] = {}
        self.results: list[dict] = []

    def get_parameter_space(self) -> dict[str, dict]:
        return {
            "temperature": {"type": "float", "min": 0.0, "max": 1.0},
            "prompt_style": {
                "type": "categorical",
                "choices": ["structured", "conversational", "chain_of_thought"],
            },
            "confidence_threshold": {"type": "float", "min": 0.3, "max": 0.9},
            "include_examples": {"type": "bool"},
            "max_tokens": {"type": "int", "min": 100, "max": 500},
        }

    def get_baseline_params(self) -> dict[str, Any]:
        return {
            "temperature": 0.3,
            "prompt_style": "structured",
            "confidence_threshold": 0.6,
            "include_examples": True,
            "max_tokens": 200,
        }

    def apply_params(self, params: dict[str, Any]) -> None:
        self.current_params = params

    def run_experiment(self) -> dict[str, Any]:
        correct = 0
        total = len(TEST_REVIEWS)
        details = []

        for review in TEST_REVIEWS:
            prompt = self._build_prompt(review["text"])
            try:
                result = self._call_ollama(prompt)
                predicted_team = result.get("team")
                predicted_strength = result.get("strength")

                is_correct = (predicted_team == review["expected_team"])
                if is_correct:
                    correct += 1

                details.append({
                    "text_preview": review["text"][:50],
                    "expected": review["expected_team"],
                    "predicted": predicted_team,
                    "correct": is_correct,
                })
            except Exception as e:
                details.append({"error": str(e), "text_preview": review["text"][:50]})

        return {
            "correct": correct,
            "total": total,
            "accuracy": correct / total if total > 0 else 0,
            "details": details,
        }

    def evaluate(self, output: dict[str, Any]) -> float:
        return output.get("accuracy", 0.0) * 100

    def reset(self) -> None:
        self.current_params = self.get_baseline_params()

    def describe_params(self, params: dict[str, Any]) -> str:
        return (
            f"style={params.get('prompt_style')}, "
            f"temp={params.get('temperature', 0):.2f}, "
            f"threshold={params.get('confidence_threshold', 0):.2f}, "
            f"examples={'yes' if params.get('include_examples') else 'no'}"
        )

    def _build_prompt(self, review_text: str) -> str:
        style = self.current_params.get("prompt_style", "structured")
        examples_block = ""
        if self.current_params.get("include_examples"):
            examples_block = """
Examples:
- "Boiler Up! Great Purdue bar!" → {"team": "Purdue Boilermakers", "strength": "primary"}
- "Nice bar, no particular team" → {"team": null, "strength": null}
"""

        if style == "structured":
            return f"""Analyze this sports bar review for team fandom signals.
{examples_block}
Review: "{review_text}"

Respond with JSON only: {{"team": "Team Name or null", "strength": "primary|secondary|friendly|null", "confidence": 0.0-1.0}}"""
        elif style == "chain_of_thought":
            return f"""Think step by step about what sports team this bar review is affiliated with.
{examples_block}
Review: "{review_text}"

First explain your reasoning, then output JSON: {{"team": "Team Name or null", "strength": "primary|secondary|friendly|null", "confidence": 0.0-1.0}}"""
        else:
            return f"""Hey, what team does this bar seem to be for based on this review?
{examples_block}
"{review_text}"

Just give me JSON: {{"team": "Team Name or null", "strength": "primary|secondary|friendly|null", "confidence": 0.0-1.0}}"""

    def _call_ollama(self, prompt: str) -> dict:
        """Call Ollama and parse JSON from response."""
        import httpx

        resp = httpx.post(
            f"{self.ollama_url}/api/generate",
            json={
                "model": "llama3.1:8b",
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": self.current_params.get("temperature", 0.3),
                    "num_predict": self.current_params.get("max_tokens", 200),
                },
            },
            timeout=30,
        )
        resp.raise_for_status()
        text = resp.json().get("response", "")

        # Extract JSON from response
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        return {"team": None, "strength": None, "confidence": 0.0}
