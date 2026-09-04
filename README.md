<div align="center">

# NyayAI

### AI-powered legal navigation for India

**Understand your rights. Navigate the law. Get verified guidance.**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://un-nyayai.vercel.app)

---

**[Live Demo](https://un-nyayai.vercel.app)** · **[Report Bug](https://github.com/Harshhdhankhar/un-nyayai/issues)** · **[Request Feature](https://github.com/Harshhdhankhar/un-nyayai/issues)**

</div>

---

## What is NyayAI?

NyayAI is an open-source legal AI assistant built specifically for the Indian legal system. It helps citizens, advocates, and organizations understand cases, documents, and legal processes in plain language — with sources you can verify.

Unlike generic AI chatbots, NyayAI is **grounded in Indian law**: it retrieves from Indian statutes, Supreme Court & High Court judgments, and eCourts data — never hallucinating legal citations.

---

## Features

| Feature | Description |
|---------|-------------|
| **AI Legal Assistant** | Describe your situation in plain language — get classified, triaged, and guided with verified sources |
| **Case Status Lookup** | Query eCourts by CNR number for hearing dates, orders, and case stage |
| **Legal Research** | Search statutes and case law via Indian Kanoon API + local vector search |
| **Law Comparison** | Compare old vs new laws (IPC→BNS, CrPC→BNSS, Evidence Act→BSA) with mapping tables |
| **Document Analysis** | Upload PDFs/DOCX — extract text, classify, identify clauses, risks, and PII |
| **Legal Drafting** | Generate notices, complaints, RTI applications, rent agreements, petitions, and more |
| **Know Your Rights** | Rights information specific to your situation and jurisdiction |
| **Legal Aid Assessment** | Check eligibility for NALSA/SLSA/DLSA legal aid services |
| **Matter Management** | Track cases with parties, evidence, timelines, tasks, and deadlines |
| **Pre/Post-Hearing Workbench** | Issue identification, cross-exam prep, hearing story, and counter-positioning |
| **PII Detection** | Automatic detection and masking of Aadhaar, PAN, IFSC, and bank accounts |
| **Multi-language** | English, Hindi, and Hinglish support |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes, TypeScript |
| Database | PostgreSQL + pgvector |
| ORM | Drizzle ORM |
| AI/LLM | Groq (OpenAI-compatible API) |
| Embeddings | OpenAI `text-embedding-3-small` (local hashing fallback) |
| Legal Data | Indian Kanoon API, eCourts India API |
| OCR | Tesseract.js, Mammoth (.docx) |
| PDF | pdfjs-dist |
| NLP | Python FastAPI microservice (Presidio PII, legal NLP) |
| Auth | JWE/JWS via jose |
| Testing | Vitest |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL with pgvector extension
- Groq API key ([free tier](https://console.groq.com) works)
- _(Optional)_ Indian Kanoon API key
- _(Optional)_ eCourts API key
- _(Optional)_ Python 3.10+ for the Legal NLP microservice

### Installation

```bash
# Clone the repo
git clone https://github.com/Harshhdhankhar/un-nyayai.git
cd un-nyayai

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Random string for session signing |
| `GROQ_API_KEY` | Recommended | Groq API key (free tier works) |
| `GROQ_MODEL` | No | Model name (default: `openai/gpt-oss-120b`) |
| `GROQ_TOKEN_BUDGET` | No | TPM cap (default: 4600 for free tier) |
| `INDIAN_KANOON_API_KEY` | No | Indian Kanoon API key |
| `ECOURTS_API_KEY` | No | eCourts API key |
| `OPENAI_EMBEDDING_API_KEY` | No | For vector embeddings |
| `LEGAL_NLP_URL` | No | Python NLP microservice URL |
| `AI_MODE` | No | `auto` or `mock` (offline mode) |

### Database Setup

```bash
npm run db:generate    # Generate migrations
npm run db:migrate     # Apply migrations
npm run db:seed        # Seed initial data (optional)
```

### Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### (Optional) Legal NLP Microservice

```bash
cd services/legal-nlp
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run test suite |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Seed database |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── app/                # Authenticated app (dashboard, assistant, etc.)
│   ├── api/                # Backend API endpoints
│   └── (auth)/             # Login, signup, password reset
├── components/             # React components
│   ├── landing/            # Landing page
│   ├── chat/               # Chat interface
│   ├── documents/          # Document management
│   ├── drafting/           # Legal drafting
│   ├── research/           # Legal research
│   ├── matter/             # Matter management
│   └── ui/                 # Shared UI primitives
├── lib/                    # Core logic
│   ├── ai/                 # LLM integration, prompts, orchestration
│   ├── legal/              # Triage, classification, rights, deadlines
│   ├── retrieval/          # Hybrid search (vector + keyword)
│   ├── drafting/           # Document generation templates
│   ├── intelligence/       # Timeline, delay analysis, hearing prep
│   ├── providers/          # eCourts, Indian Kanoon integrations
│   └── db/                 # Database schema & client
└── tests/                  # Test suite
```

---

## How It Works

```
User describes legal situation
        │
        ▼
┌─────────────────┐
│   Triage &      │  ← Classifies category, extracts entities,
│   Classification│     identifies urgency
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Retrieval     │  ← Searches statutes, judgments, eCourts
│   (Hybrid)      │     via vector + keyword matching
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   AI Pipeline   │  ← Generates grounded response with
│   (Groq LLM)    │     verified source citations
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Verification  │  ← Cross-checks claims against
│   & Delivery    │     retrieved sources
└─────────────────┘
```

---

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the **GNU Affero General Public License v3.0** — see the [LICENSE](LICENSE) file for details.

**You are free to use, modify, and distribute this software, provided that:**

- You give proper credit and attribution to the original author
- You include a link to the original repository
- If you modify and distribute the software, you must distribute your modifications under the same license (AGPL-3.0)
- You disclose the source code of any modified versions

Failure to provide proper attribution constitutes a license violation and may result in legal action.

---

## Acknowledgments

- [Indian Kanoon](https://indiankanoon.org/) — Free Indian legal search engine
- [eCourts India](https://ecourts.gov.in/) — Indian judiciary digital infrastructure
- [Groq](https://groq.com/) — Fast AI inference
- [Vercel](https://vercel.com/) — Hosting and deployment
- [Drizzle ORM](https://orm.drizzle.team/) — TypeScript ORM
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS

---

<div align="center">

**Built with care for the Indian legal system**

Made by **Harsh Dhankhar**

</div>
