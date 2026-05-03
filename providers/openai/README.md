# Openai Provider Adapter

Package: `@aurekai/openai`

## Surfaces

1. Tool calling adapter
2. Remote MCP server bridge
3. Provider workflow template
4. Batch and eval connector
5. Semantic cache and model-memory hook

## Primary Capability

- OpenAI Responses API tools + remote MCP bridge

## Example Commands

```bash
akai provider openai tools:print
akai provider openai run --proof --semantic-cache
```

## Local Runner

```bash
npm run openai:demo
node providers/openai/run.mjs --dry-run --remote-mcp https://mcp.aurekai.ai
```

To execute a live Responses API request, set `OPENAI_API_KEY` and omit `--dry-run`.

```bash
OPENAI_API_KEY=... node providers/openai/run.mjs --input "Run aurekai.doctor and summarize"
```

Generated proof artifacts are written to `output/openai/` by default.
