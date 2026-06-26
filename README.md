# QueueStorm Investigator

**QueueStorm Investigator** is an AI/API SupportOps copilot for a digital finance platform, built for the **SUST CSE Carnival 2026 Codex Community Hackathon — Preliminary Round**.

It accepts customer support tickets, analyzes transaction histories, classifies issues, determines severity/department, and generates safe customer-facing replies — all through a deterministic rule-based pipeline with an optional LLM phrasing layer.

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (Node.js + TypeScript)
- **Language**: TypeScript (strict mode)
- **Validation**: `class-validator` + `class-transformer` via NestJS `ValidationPipe`
- **Config**: `@nestjs/config` (`.env`-based)
- **Security**: Helmet, CORS, input sanitization, safety guard post-processor
- **LLM SDKs**: OpenAI (`openai`) and Anthropic (`@anthropic-ai/sdk`)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build
npm run build

# 3. Start server
npm run start:prod

# 4. Verify (in another terminal)
curl http://localhost:3000/health
# -> {"status":"ok"}
```

For detailed step-by-step instructions, see [RUNBOOK.md](./RUNBOOK.md).

## Project Structure

```
src/
  main.ts                          # Entry point, global setup
  app.module.ts                    # Root module
  health/                          # GET /health endpoint
  analyze-ticket/
    analyze-ticket.controller.ts   # POST /analyze-ticket
    analyze-ticket.service.ts      # Pipeline orchestrator
    dto/                           # Request/response DTOs
    investigator/
      evidence-matcher.service.ts  # Matches complaint -> transaction
      case-classifier.service.ts   # Determines case_type
      router.service.ts            # Determines department + severity + human_review_required
      safety-guard.service.ts      # Sanitizes customer_reply (Section 8 rules)
      llm-reasoner.service.ts      # Optional LLM phrasing with fallback
      reply-templates.ts           # Safe canned reply templates (en + bn)
  common/
    filters/all-exceptions.filter.ts
    interceptors/timeout.interceptor.ts
    interceptors/logging.interceptor.ts
```

## API

### `GET /health`
Returns `{ "status": "ok" }`. Ready within 60s of process start.

### `POST /analyze-ticket`
Accepts a support ticket with optional transaction history. Returns a full analysis response.

Request body and response schema are documented in the problem specification. Key response fields:
- `case_type`, `severity`, `department` — enumerated classifications
- `evidence_verdict` — `consistent` / `inconsistent` / `insufficient_data`
- `customer_reply` — safe, customer-facing, language-matched
- `human_review_required` — boolean flag for manual review

## AI Approach

### Deterministic Pipeline (always runs)
1. **Input Sanitization** — Strips prompt-injection patterns from complaint text
2. **Evidence Matching** — Rule-based scoring of transaction history against complaint signals (amount, time, counterparty, type)
3. **Case Classification** — Priority-ordered rules map complaint intent to exactly one `case_type`
4. **Routing** — Determines `department`, `severity`, and `human_review_required` from case type + evidence
5. **Content Generation** — Templates or LLM produce `agent_summary`, `recommended_next_action`, `customer_reply`
6. **Safety Guard** — Post-processing pass enforces Section 8 rules on all text outputs

### Optional LLM Phrasing Layer
- Pluggable behind a single `LlmReasonerService` interface
- Supports OpenAI and Anthropic via `LLM_PROVIDER` env var
- The LLM **never** modifies deterministic outputs — it only rephrases prose
- Wrapped with hard timeout and graceful fallback to templates
- **Default: fully rule-based** (no API key = no LLM calls, zero cost)

### Safety Logic (Section 8 Mapping)
| Rule | Implementation |
|---|---|
| Never ask for PIN/OTP/password | Regex scan + replacement with standard disclaimer |
| Never confirm refunds/reversals without authority | Pattern detection → safe "eligible amount" language |
| No third-party redirects | Strip external numbers/links → official channels reminder |
| PIN safety reminder | Always appended to every `customer_reply` |

## Models

| Model | Where | Why |
|---|---|---|
| Rule-based pipeline | In-process (NestJS services) | Zero cost, deterministic, always works |
| OpenAI GPT-4o-mini (optional) | External API | Low-cost phrasing layer |
| Anthropic Claude 3 Haiku (optional) | External API | Low-cost phrasing layer alternative |

**Cost reasoning**: The rule-based pipeline costs nothing and handles all classification, routing, and safety decisions. The LLM is only used for natural language phrasing of the 3 text fields, and only if API keys are configured. For the hackathon, the default fully-rule-based mode is recommended.

## Assumptions

- Transaction timestamps are in ISO 8601 format
- Bangla text uses UTF-8 encoding throughout
- `metadata` is an opaque object, not used in analysis
- Empty `transaction_history` is valid (no transactions available)
- The `campaign_context` field is informational only

## Known Limitations

- Evidence matching uses heuristic scoring, not ML — works well on clear cases but may be ambiguous on very vague complaints
- Bangla numeral extraction is basic; complex mixed-script amounts may not parse correctly
- LLM fallback is "all or nothing" — if the LLM call fails, templates are used for all three text fields
- No persistent storage or database — each request is processed independently
