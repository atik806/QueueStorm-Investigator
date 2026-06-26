# QueueStorm Investigator — Runbook

## Prerequisites

- Node.js >= 22
- npm >= 10
- _(Optional)_ OpenAI or Anthropic API key for the LLM phrasing layer

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> queue-storm-investigator
cd queue-storm-investigator

# 2. Install dependencies
npm install

# 3. (Optional) Configure environment
cp .env.example .env
# Edit .env if you want to set API keys or change thresholds

# 4. Build
npm run build

# 5. Start the server
npm run start:prod
```

## Verify the Service

### Health check
```bash
curl http://localhost:3000/health
# -> {"status":"ok"}
```

### Analyze a ticket
```bash
curl -X POST http://localhost:3000/analyze-ticket \
  -H 'Content-Type: application/json' \
  -d '{
    "ticket_id": "TKT-DEMO-001",
    "complaint": "I sent 5000 BDT to my brother but it went to the wrong number",
    "language": "en",
    "transaction_history": [
      {
        "transaction_id": "TXN-1001",
        "timestamp": "2026-06-25T14:30:00Z",
        "type": "transfer",
        "amount": 5000,
        "counterparty": "01312345678",
        "status": "completed"
      }
    ]
  }'

# -> 200 with full analysis response
```

### Error cases
```bash
# Missing required fields -> 400
curl -X POST http://localhost:3000/analyze-ticket \
  -H 'Content-Type: application/json' \
  -d '{}'

# Empty complaint -> 422
curl -X POST http://localhost:3000/analyze-ticket \
  -H 'Content-Type: application/json' \
  -d '{"ticket_id":"T-1","complaint":""}'

# Invalid enum -> 422
curl -X POST http://localhost:3000/analyze-ticket \
  -H 'Content-Type: application/json' \
  -d '{"ticket_id":"T-1","complaint":"test","channel":"bad_value"}'
```

## Docker

```bash
# Build the image
docker build -t queue-storm-investigator .

# Run
docker run -p 3000:3000 \
  -e PORT=3000 \
  queue-storm-investigator
```

## Environment Variables

See `.env.example` for all options. Key variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | 3000 | HTTP listen port |
| `LLM_PROVIDER` | _(none)_ | `openai` or `anthropic` to enable AI phrasing |
| `OPENAI_API_KEY` | _(none)_ | OpenAI API key |
| `ANTHROPIC_API_KEY` | _(none)_ | Anthropic API key |
| `HIGH_VALUE_THRESHOLD_BDT` | 50000 | Threshold for high-value escalation |
| `REQUEST_TIMEOUT_MS` | 30000 | Hard timeout for `/analyze-ticket` |

## LLM Integration

If no API keys are set, the service runs in **fully rule-based mode** — all content generation uses deterministic templates. This is the default and intended for the hackathon to keep costs at zero.

To enable the LLM phrasing layer:
1. Set `LLM_PROVIDER=openai` (or `anthropic`)
2. Set the corresponding `*_API_KEY`
3. Restart — the LLM will only rephrase `agent_summary`, `recommended_next_action`, and `customer_reply`, never change the deterministic pipeline outputs.

## Testing

```bash
npm test
```

## Troubleshooting

- **Port in use**: Kill the existing process or change `PORT` in `.env`.
- **Module not found**: Run `npm install` then `npm run build`.
- **LLM calls failing**: Check your API key and network. The service falls back to templates gracefully.
