# Legal NLP microservice

Optional companion service that provides offline, rule-based NLP analysis of
legal documents (entities, obligations, deadlines and risk flags). The Next.js
app works entirely without it — it only calls this service when
`LEGAL_NLP_URL` is set and reachable.

## Run

```bash
cd services/legal-nlp
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check: `curl http://localhost:8000/health`

## Endpoints

### `POST /analyze`

Analyse a document's extracted text.

```bash
curl -X POST http://localhost:8000/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text": "The tenant shall pay rent of Rs 40000 by the 7th of every month...", "language": "en"}'
```

Returns:

```json
{
  "entities": [{ "kind": "amount", "value": "Rs 40000" }, ...],
  "obligations": [{ "subject": "tenant", "verb": "shall pay", "object": "rent of Rs 40000" }],
  "deadlines": [{ "trigger": "pay rent", "date": "7th of every month" }],
  "risks": [{ "level": "medium", "text": "..." }],
  "summary": "..."
}
```

### `GET /health`

Returns service status, version, and whether Presidio / OCR are available.

### `POST /pii` — PII detection

Microsoft Presidio (when installed) unioned with deterministic Indian
identifiers (PAN with format check, Aadhaar with Verhoeff checksum, IFSC,
Indian mobile numbers, bank account numbers, credit cards with Luhn).
Overlapping lower-confidence spans are dropped.

```bash
curl -X POST http://localhost:8017/pii \
  -H 'Content-Type: application/json' \
  -d '{"text": "Tenant PAN ABCDE1234F, Aadhaar 4927 4389 1284, call 9876543210"}'
```

Returns `{ "engine": "presidio" | "regex", "entities": [{entity_type, text,
confidence, start, end}, ...] }`. Page numbers are resolved by the Node app
from character offsets.

### `POST /ocr` — OCR for scanned pages (optional)

Accepts base64 images (`{"images": ["<b64>", ...], "language": "eng"}`) and
returns extracted text per page via pytesseract. Requires the `pytesseract`
and `Pillow` packages plus a system `tesseract` binary; returns
`{"available": false}` otherwise.

## Enabling full Presidio

The service degrades to regex-only PII detection without Presidio:

```bash
source .venv/bin/activate
pip install presidio-analyzer
python -m spacy download en_core_web_sm   # or en_core_web_lg for higher accuracy
```

