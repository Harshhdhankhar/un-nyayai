"""Legal text analysis service.

Rule-based legal analysis plus optional Microsoft Presidio PII detection and
optional OCR. Designed to run offline and be fast. Every heavy dependency
(Presidio, spaCy, pytesseract) is optional — endpoints degrade gracefully to
pure-Python fallbacks when they are not installed.
"""

from __future__ import annotations

import base64
import io
import re
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="NyayAI Legal NLP",
    description="Legal document analysis: entities, obligations, deadlines, risks, PII detection (Presidio), OCR.",
    version="0.2.0",
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
    return {
        "ok": True,
        "service": "legal-nlp",
        "version": "0.2.0",
        "presidio": _presidio_available(),
        "ocr": _ocr_available(),
    }


# --------------------------------------------------------------------------
# PII detection — Microsoft Presidio when available, regex fallbacks always.
# --------------------------------------------------------------------------

class PiiEntity(BaseModel):
    entity_type: str
    text: str = Field(..., max_length=200)
    confidence: float = Field(..., ge=0, le=1)
    start: int = Field(..., ge=0)
    end: int = Field(..., ge=0)


class PiiRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=400_000)


class PiiResponse(BaseModel):
    entities: list[PiiEntity]
    engine: str  # "presidio" | "regex"


_OCR_READER: list[Any] = []


def _presidio_available() -> bool:
    try:
        import presidio_analyzer  # noqa: F401
        return True
    except Exception:
        return False


def _ocr_available() -> bool:
    try:
        import pytesseract  # noqa: F401
        from PIL import Image  # noqa: F401
        return True
    except Exception:
        return False


_VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 6, 7, 8, 0, 1, 2, 3, 4],
    [6, 7, 8, 9, 5, 3, 4, 0, 1, 2],
    [7, 8, 9, 5, 6, 4, 0, 1, 2, 3],
    [8, 9, 5, 6, 7, 5, 3, 4, 0, 1],
    [9, 5, 6, 7, 8, 1, 2, 3, 4, 0],
]
_VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]


def _verhoeff_valid(digits: str) -> bool:
    c = 0
    for i, ch in enumerate(reversed(digits)):
        c = _VERHOEFF_D[c][_VERHOEFF_P[(i + 1) % 8][int(ch)]]
    return c == 0


_LUHN_LOOKUP = (0, 2, 4, 6, 8, 1, 3, 5, 7, 9)


def _luhn_valid(digits: str) -> bool:
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 1:
            d = _LUHN_LOOKUP[d]
        total += d
    return total % 10 == 0


PAN_RE = re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")
AADHAAR_RE = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")
IFSC_RE = re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b")
PHONE_IN_RE = re.compile(
    r"(?:\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b"
)
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
CREDIT_CARD_RE = re.compile(r"\b(?:\d{4}[\s-]?){3}\d{4}\b")
BANK_ACCOUNT_RE = re.compile(
    r"(?:a/c|account)\s*(?:no\.?|number)?\s*[:\-]?\s*(\d{9,18})", re.IGNORECASE
)


def _regex_pii(text: str) -> list[PiiEntity]:
    out: list[PiiEntity] = []
    seen: set[tuple[str, int]] = set()

    def add(t: str, s: int, e: int, conf: float) -> None:
        key = (t, s)
        if key not in seen:
            out.append(PiiEntity(entity_type=t, text=text[s:e][:200], confidence=conf, start=s, end=e))
            seen.add(key)

    for m in PAN_RE.finditer(text):
        add("PAN", m.start(), m.end(), 0.95)
    for m in AADHAAR_RE.finditer(text):
        digits = m.group(0).replace(" ", "")
        conf = 0.97 if _verhoeff_valid(digits) else 0.55
        add("AADHAAR", m.start(), m.end(), conf)
    for m in IFSC_RE.finditer(text):
        add("IFSC", m.start(), m.end(), 0.95)
    for m in PHONE_IN_RE.finditer(text):
        add("PHONE_NUMBER", m.start(), m.end(), 0.85)
    for m in EMAIL_RE.finditer(text):
        add("EMAIL_ADDRESS", m.start(), m.end(), 0.99)
    for m in CREDIT_CARD_RE.finditer(text):
        digits = m.group(0).replace(" ", "").replace("-", "")
        conf = 0.96 if _luhn_valid(digits) else 0.5
        add("CREDIT_CARD", m.start(), m.end(), conf)
    for m in BANK_ACCOUNT_RE.finditer(text):
        start = m.start(1)
        add("BANK_ACCOUNT", start, m.end(1), 0.85)
    return out


_presidio_engine: Any = None


def _get_presidio() -> Any:
    """Initialize Presidio once, preferring locally installed spaCy models.

    Returns False when Presidio cannot be used so callers fall back to the
    regex engine instead of failing or hanging.
    """
    global _presidio_engine
    if _presidio_engine is not None:
        return _presidio_engine
    try:
        import spacy

        model = None
        for candidate in ("en_core_web_sm", "en_core_web_lg"):
            try:
                spacy.load(candidate)
                model = candidate
                break
            except Exception:
                continue
        if model is None:
            _presidio_engine = False
            return False

        from presidio_analyzer import AnalyzerEngine
        from presidio_analyzer.nlp_engine import NlpEngineProvider

        engine = NlpEngineProvider(
            nlp_configuration={
                "nlp_engine_name": "spacy",
                "models": [{"lang_code": "en", "model_name": model}],
            }
        ).create_engine()
        _presidio_engine = AnalyzerEngine(nlp_engine=engine, supported_languages=["en"])
        return _presidio_engine
    except Exception:
        _presidio_engine = False
        return False


def _dedupe_overlaps(entities: list[PiiEntity]) -> list[PiiEntity]:
    """Keep the highest-confidence entity per overlapping span."""
    ordered = sorted(entities, key=lambda e: (-e.confidence, -(e.end - e.start)))
    kept: list[PiiEntity] = []
    taken: list[tuple[int, int]] = []
    for ent in ordered:
        if any(not (ent.end <= s or ent.start >= e) for s, e in taken):
            continue
        kept.append(ent)
        taken.append((ent.start, ent.end))
    return sorted(kept, key=lambda e: e.start)


@app.post("/pii", response_model=PiiResponse)
def pii(req: PiiRequest) -> PiiResponse:
    text = req.text
    engine = _get_presidio()
    if engine is False:
        return PiiResponse(entities=_regex_pii(text), engine="regex")

    results = engine.analyze(text=text, language="en", return_decision_process=False)
    out = [
        PiiEntity(
            entity_type=r.entity_type,
            text=text[r.start : r.end][:200],
            confidence=float(r.score),
            start=r.start,
            end=r.end,
        )
        for r in results
    ]
    # Presidio's pretrained model misses most Indian identifiers — union with
    # the deterministic recognizers, then drop overlapping low scorers.
    out.extend(_regex_pii(text))
    return PiiResponse(entities=_dedupe_overlaps(out), engine="presidio")


class OcrRequest(BaseModel):
    images: list[str] = Field(..., min_length=1, max_length=20)  # base64 PNG/JPEG
    language: str = Field(default="eng")


class OcrResponse(BaseModel):
    pages: list[str]
    available: bool


@app.post("/ocr", response_model=OcrResponse)
def ocr(req: OcrRequest) -> OcrResponse:
    if not _ocr_available():
        return OcrResponse(pages=[], available=False)
    import pytesseract
    from PIL import Image

    pages: list[str] = []
    for b64 in req.images:
        try:
            img = Image.open(io.BytesIO(base64.b64decode(b64)))
            pages.append(pytesseract.image_to_string(img, lang=req.language))
        except Exception:
            pages.append("")
    return OcrResponse(pages=pages, available=True)


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
