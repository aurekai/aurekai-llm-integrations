# xAI Grok Function Adapter Demo

Goal: xAI Grok routes Aurekai tool calls via the function adapter, with long-context lineage digest.

```bash
npm run xai:demo
node providers/xai/run.mjs --dry-run
```

## How it works

xAI's function-calling API (OpenAI-compatible) binds to `schemas/xai-tools.json` (48 tools).
The adapter builds a lineage digest for long-context runs and emits it as `aurekai://proof/xai/...`.

## Example envelope

```json
{
  "model": "grok-2-latest",
  "tools": [{ "type": "function", "function": { "name": "aurekai.reason.start", "description": "...", "parameters": {} } }],
  "tool_choice": "auto"
}
```

## MCP integration

Connect via `@aurekai/mcp` to expose all 48 tools through Grok's tool router:

```json
{
  "mcpServers": {
    "aurekai": {
      "command": "npx",
      "args": ["-y", "@aurekai/mcp"]
    }
  }
}
```
