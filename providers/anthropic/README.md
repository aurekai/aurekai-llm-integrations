# Anthropic Provider Adapter

Package: `@aurekai/anthropic`

## Surfaces

1. Tool calling adapter
2. Remote MCP server bridge
3. Provider workflow template
4. Batch and eval connector
5. Semantic cache and model-memory hook

## Primary Capability

- Claude tool use + MCP workflows

## Example Commands

```bash
akai provider anthropic tools:print
akai provider anthropic run --proof --semantic-cache
```

## Local Runner

```bash
npm run anthropic:demo
node providers/anthropic/run.mjs --dry-run --mcp-config providers/anthropic/claude-desktop.mcp.example.json
```

To execute a live Messages API request, set `ANTHROPIC_API_KEY` and omit `--dry-run`.
