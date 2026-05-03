<p align="center">
  <img src="https://raw.githubusercontent.com/aurekai/aurekai/main/assets/aurekai-logo.svg" alt="Aurekai" width="520" />
</p>

# `@aurekai/llm-integrations` · v0.8.0-alpha.1

Provider-neutral LLM binding layer for the [Aurekai](https://github.com/aurekai/aurekai) capability runtime.
Exposes **48 operators across 9 capability families** to all major model providers via a unified canonical tool schema, MCP bridge, evals harness, and gateway router.

## Capability Families

| Family | Tools | Description |
|---|---|---|
| `runtime` | 8 | Dispatch, enqueue, gate, doctor, recipe runner |
| `commerce` | 6 | Auth, invoicing, metering, ledger, feature gates |
| `intake` | 4 | Transcription, ingest, transcript cleaning, frame extraction |
| `memory` | 10 | Model pull, FPQ compress, vector search, SAE activate, embed, cache |
| `proof` | 7 | Bundle, hash, lineage graph, export, canon parse, inspect |
| `reason` | 3 | Session start, branch, diff |
| `wire` | 3 | Tel listen, PCAP ingest, wire report |
| `publish` | 4 | Brief, deliverable, distribute, narrate |
| `substrate` | 3 | Space open/put, capability registry |

## Provider Coverage

| Provider | Tools | MCP | Schema Format | Evals |
|---|---|---|---|---|
| OpenAI | 48 | ✓ | `tools[].function` | ✓ |
| Anthropic | 48 | ✓ | `tools[].input_schema` | ✓ |
| Gemini | 48 | via bridge | `function_declarations[]` | ✓ |
| Mistral | 48 | ✓ | `tools[].function` | ✓ |
| Groq | 48 | ✓ | `tools[].function` | ✓ |
| xAI | 48 | via aurekai-mcp | `tools[].function` | ✓ |
| Perplexity | 48 | via aurekai-mcp | `functions[]` | ✓ |
| Cohere | 48 | via aurekai-mcp | `parameter_definitions` | ✓ |
| Local (Ollama/llama.cpp) | 48 | ✓ | `functions[]` | ✓ |

## Quick Start

```bash
npm install
npm run schemas:generate    # regenerate all 9 provider schemas from canonical
npm run evals:run           # 9 providers × 8 metrics dry-run matrix
npm run gateway:demo        # capability-aware provider router
npm run openai:demo         # OpenAI remote MCP demo
```

## Schemas

Canonical contract: `schemas/aurekai-tools.canonical.json` — single source of truth.
Provider schemas are **generated**; do not edit them manually.

```bash
node scripts/generate-provider-schemas.mjs
# → schemas/{openai,anthropic,gemini,mistral,groq,xai,perplexity,cohere,local}-tools.json
```

## Evals

```bash
node evals/runner.mjs
# → output/evals/evals-report.json  (9 providers × 8 metrics)
# → output/evals/{provider}.akrun.json + .akproof.json
```

Metrics: `latency_ms`, `cost_usd`, `cache_hit_rate`, `proof_completeness`, `retrieval_precision`, `feature_drift`, `tool_call_success`, `schema_compliance`.

## Gateway

The capability router in `gateway/index.mjs` selects the optimal provider for a request based on declared requirements (latency, cost, proof, retrieval, local):

```js
import { gatewayRequest } from "@aurekai/llm-integrations/gateway";
const result = await gatewayRequest({ tool: "aurekai.memory.vec_search", query: "..." }, { prefer: "local" });
```

## Examples

| Provider | Demo |
|---|---|
| OpenAI | [examples/openai-remote-mcp.md](examples/openai-remote-mcp.md) |
| Anthropic | [examples/anthropic-claude-desktop-mcp.md](examples/anthropic-claude-desktop-mcp.md) |
| Gemini | [examples/gemini-cache-bridge.md](examples/gemini-cache-bridge.md) |
| Groq | [examples/groq-low-latency.md](examples/groq-low-latency.md) |
| Perplexity | [examples/perplexity-citations.md](examples/perplexity-citations.md) |
| Mistral | [examples/mistral-managed-connector.md](examples/mistral-managed-connector.md) |
| xAI | [examples/xai-function-adapter.md](examples/xai-function-adapter.md) |
| Cohere | [examples/cohere-rerank-pack.md](examples/cohere-rerank-pack.md) |
| Local | [examples/local-llama-stack.md](examples/local-llama-stack.md) |

## Monorepo Layout

```
providers/       9 provider adapters (adapter.mjs, run.mjs, manifest.json, README.md)
gateway/         capability-aware provider router
schemas/         canonical tool contract + 9 generated provider schemas
evals/           cross-provider benchmark harness + matrix.json
examples/        9 provider demos
docs/            architecture, provider matrix, roadmap
scripts/         schema generator
```

## MCP

All 48 tools are available via [`@aurekai/mcp`](https://github.com/aurekai/aurekai-mcp) — add to any MCP client:

```json
{
  "mcpServers": {
    "aurekai": { "command": "npx", "args": ["-y", "@aurekai/mcp"] }
  }
}
```

## License

MIT
