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

Returns service status and version.
