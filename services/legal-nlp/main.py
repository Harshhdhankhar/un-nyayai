"""Rule-based legal text analysis service.

Pure Python, no ML dependencies. Designed to run offline and be fast.
Provides: entity extraction, obligation/deadline detection and risk flags.
"""

from __future__ import annotations

import re
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="NyayAI Legal NLP",
    description="Rule-based analysis of legal documents (entities, obligations, deadlines, risks).",
    version="0.1.0",
)


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=400_000)
    language: str = Field(default="en", pattern="^(en|hi|hinglish)$")


class Entity(BaseModel):
    kind: str
    value: str
    confidence: float


class Obligation(BaseModel):
    subject: str
    verb: str
    object: str


class Deadline(BaseModel):
    trigger: str
    detail: str


class Risk(BaseModel):
    level: str
    text: str


class AnalyzeResponse(BaseModel):
    entities: list[Entity]
    obligations: list[Obligation]
    deadlines: list[Deadline]
    risks: list[Risk]
    summary: str


AMOUNT_RE = re.compile(
    r"(?:Rs\.?|INR|₹)\s?([\d,]+(?:\.\d+)?)", re.IGNORECASE
)
DATE_RE = re.compile(
    r"\b(0?[1-9]|[12]\d|3[01])\s+"
    r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*"
    r"(?:\s+(\d{2,4}))?\b",
    re.IGNORECASE,
)
SECTION_RE = re.compile(r"\b(?:section|sec\.?|s\.)\s?\d+[a-z]?(?:\([a-z\d]+\))?", re.IGNORECASE)
CASE_NO_RE = re.compile(r"\b[A-Z]{2,4}\d{8,}\b")

OBLIGATION_PATTERNS: list[tuple[re.Pattern[str], int]] = [
    (re.compile(r"(?:shall|must|will)\s+(\w+\s+){0,6}?\b(pay|return|provide|deliver|maintain|submit|notify|comply|surrender|refund)\b", re.IGNORECASE), 2),
    (re.compile(r"\b(is\s+liable|shall\s+be\s+liable)\b", re.IGNORECASE), 1),
]

DEADLINE_PATTERNS = [
    r"(?:within|by)\s+(\d{1,3}\s+(?:days?|weeks?|months?|working\s+days?))",
    r"(?:within|by)\s+(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{2,4})",
    r"(\d{1,2}(?:st|nd|rd|th)?\s+day\s+of\s+each\s+month)",
]

RISK_PATTERNS = [
    (r"\b(?:forfeiture|penalty|fine|interest\s+rate|compound\s+interest|termination\s+rights?|no\s+refund)\b", "high"),
    (r"\b(?:contingent|subject\s+to|unless|provided\s+that|only\s+upon|at\s+its\s+sole\s+discretion)\b", "medium"),
    (r"\b(?:indemnif|warrant|represent|force\s+majeure)\b", "medium"),
]


def _extract_entities(text: str) -> list[Entity]:
    entities: list[Entity] = []
    seen: set[str] = set()
    for match in AMOUNT_RE.finditer(text):
        value = match.group(0)
        if value.lower() not in seen:
            entities.append(Entity(kind="amount", value=value, confidence=0.9))
            seen.add(value.lower())
    for match in SECTION_RE.finditer(text):
        value = match.group(0)
        if value.lower() not in seen:
            entities.append(Entity(kind="section", value=value, confidence=0.85))
            seen.add(value.lower())
    for match in CASE_NO_RE.finditer(text):
        value = match.group(0)
        if value.lower() not in seen:
            entities.append(Entity(kind="case_number", value=value, confidence=0.95))
            seen.add(value.lower())
    for match in DATE_RE.finditer(text):
        value = match.group(0)
        if value.lower() not in seen:
            entities.append(Entity(kind="date", value=value, confidence=0.8))
            seen.add(value.lower())
    return entities[:40]


def _extract_obligations(text: str) -> list[Obligation]:
    obligations: list[Obligation] = []
    for pat, verb_group in OBLIGATION_PATTERNS:
        for match in pat.finditer(text):
            verb = match.group(verb_group).lower()
            sentence_start = max(0, match.start() - 200)
            sentence = text[sentence_start : match.end() + 120].strip()
            subject = ""
            m = re.search(r"\b(the\s+[\w\s]+?)\s+(?:shall|must|will)\s+", sentence, re.IGNORECASE)
            if m:
                subject = m.group(1).strip()
            obligations.append(
                Obligation(subject=subject or "party", verb=verb, object=match.group(0))
            )
    return obligations[:20]


def _extract_deadlines(text: str) -> list[Deadline]:
    deadlines: list[Deadline] = []
    for pat in DEADLINE_PATTERNS:
        for match in re.finditer(pat, text, re.IGNORECASE):
            detail = match.group(0)
            start = max(0, match.start() - 80)
            trigger = text[start:match.start()].strip().split(".")[-1].strip()
            deadlines.append(Deadline(trigger=trigger or "document", detail=detail))
    return deadlines[:20]


def _extract_risks(text: str) -> list[Risk]:
    risks: list[Risk] = []
    for pat, level in RISK_PATTERNS:
        for match in re.finditer(pat, text, re.IGNORECASE):
            start = max(0, match.start() - 60)
            snippet = text[start : match.end() + 40].replace("\n", " ").strip()
            risks.append(Risk(level=level, text=snippet))
    return risks[:20]


def _summarize(text: str) -> str:
    flat = re.sub(r"\s+", " ", text).strip()
    return f"{flat[:300]}…" if len(flat) > 300 else flat


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "legal-nlp", "version": "0.1.0"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    text = req.text
    return AnalyzeResponse(
        entities=_extract_entities(text),
        obligations=_extract_obligations(text),
        deadlines=_extract_deadlines(text),
        risks=_extract_risks(text),
        summary=_summarize(text),
    )
