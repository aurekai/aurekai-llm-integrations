# Gateway

Aurekai AI Gateway normalizes provider traffic and injects Aurekai tool contracts.

## Responsibilities

- Normalize request and response envelopes across providers
- Route by capability and policy
- Attach canonical Aurekai tool schemas
- Persist run artifacts and proof bundles
- Apply semantic cache and model memory hooks

## Provider Adapter Slots

- providers/openai.ts
- providers/anthropic.ts
- providers/gemini.ts
- providers/mistral.ts
- providers/groq.ts
- providers/xai.ts
- providers/perplexity.ts
- providers/cohere.ts
- providers/local.ts
