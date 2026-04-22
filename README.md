# SafeCourt AI

A privacy-first AI legal analysis platform that anonymises sensitive legal documents before any AI processing, then runs a structured multi-agent courtroom debate to produce a reasoned verdict.

---

## Overview

SafeCourt AI is designed for users who need legal-style analysis of sensitive case documents without exposing personal data to external AI models.

The platform:

1. Detects personally identifiable information (PII)
2. Replaces identities with secure tokens
3. Stores identity mappings locally in an encrypted browser vault
4. Sends only sanitised text to AI agents
5. Runs a structured legal debate between Defense, Prosecution, and Judge agents

---

## Core Goal

Traditional AI tools often require sending raw user data to external systems. SafeCourt AI separates:

* **Identity Data** → stored locally and encrypted
* **Case Facts** → processed only after sanitisation

This enables privacy-preserving legal reasoning.

---

## Tech Stack

| Layer    | Technology                |
| -------- | ------------------------- |
| Frontend | React + Vite + TypeScript |
| Styling  | Tailwind CSS              |
| Backend  | FastAPI (Python)          |
| AI Model | Claude Haiku (Anthropic)  |
| Database | PostgreSQL                |
| ORM      | SQLAlchemy                |
| Routing  | React Router              |
| Security | Browser Crypto API        |

---

## Architecture

```text
Frontend (React)
    ↓
REST API Calls
    ↓
Backend (FastAPI)
    ↓
Sanitiser + Debate Engine
    ↓
Claude AI
    ↓
PostgreSQL
```

---

## Frontend Structure

```text
artifacts/vaultsim/src/
├── pages/
├── components/
├── contexts/
├── hooks/
└── utils/
```

### Main Pages

* **Home** – Submit text or PDF documents
* **Trial** – Watch debate unfold
* **Vault** – View token mappings
* **History** – Past verdicts
* **Verdict Detail** – Full saved transcript

---

## Backend Structure

```text
backend/app/
├── api/
├── services/
├── models/
└── core/
```

### API Endpoints

#### Authentication

* `POST /api/auth/session`
* `DELETE /api/auth/session`

#### Processing Pipeline

* `POST /api/pipeline/run/text`
* `POST /api/pipeline/run/pdf`
* `POST /api/pipeline/simplify-verdict`

#### Verdicts

* `POST /api/verdicts`
* `GET /api/verdicts`
* `GET /api/verdicts/{id}`

#### Utility

* `GET /api/health`

---

## Database Design

Uses **PostgreSQL** with relational schema.

### Tables

* `sessions` – active sessions and expiry
* `sanitized_outputs` – anonymised documents
* `debates` – transcript history
* `verdicts` – final judgments

---

## Data Flow

```text
User uploads text/PDF
        ↓
Frontend sends request with Session ID
        ↓
Backend validates session
        ↓
Sanitiser replaces PII with tokens
        ↓
Sanitised case sent to AI debate engine
        ↓
Defense vs Prosecution debate
        ↓
Judge issues verdict
        ↓
Response shown in frontend
        ↓
Verdict optionally saved
```

---

## Privacy Layer

Example:

```text
Original:
Jane Morrison from New York signed the agreement.

Sanitised:
TOKEN_A1B2C3 from TOKEN_X9Y8Z7 signed the agreement.
```

Real identity mappings remain inside the browser's encrypted vault.

---

## AI Reasoning Engine

Powered by **Claude Haiku**.

### Roles

* **Defense Counsel** – argues supporting side
* **Prosecution Counsel** – challenges weaknesses
* **Judge** – issues final verdict

---

## Local Development

### Backend

```bash
cd backend
uvicorn app.main:app --reload
```

### Frontend

```bash
cd artifacts/vaultsim
npm install
npm run dev
```

---

## Future Improvements

* Export reports as PDF
* Legal citation engine
* Multi-language support
* Case comparison mode
* Collaboration workspace

---

## Disclaimer

SafeCourt AI is an educational and experimental legal-tech platform. It does not replace qualified legal counsel.
