# Cohere Rerank + Tool Pack Demo

Goal: Cohere Command routes Aurekai tool calls with rerank-assisted retrieval, producing proof bundles.

```bash
npm run cohere:demo
node providers/cohere/run.mjs --dry-run
```

## How it works

Cohere's tool-use API binds to `schemas/cohere-tools.json` (48 tools, Cohere `parameter_definitions` format).
The adapter uses Cohere's rerank endpoint to surface the most relevant Aurekai tools for a given query,
then routes the call and captures proof artifacts.

## Example envelope

```json
{
  "model": "command-r-plus",
  "tools": [{
    "name": "aurekai.memory.vec_search",
    "description": "Semantic vector search over the Aurekai artifact and memory store.",
    "parameter_definitions": {
      "query": { "description": "", "type": "str", "required": true },
      "top_k": { "description": "", "type": "int", "required": false }
    }
  }]
}
```

## MCP integration

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
