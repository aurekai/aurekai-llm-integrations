# Mistral Managed Connector Demo

Goal: Mistral routes Aurekai tool calls through the managed connector, producing proof artifacts.

```bash
npm run mistral:demo
node providers/mistral/run.mjs --dry-run
```

## How it works

Mistral's function-calling API binds to `schemas/mistral-tools.json` (48 tools, OpenAI-compatible format).
The managed connector injects `_meta.run_id` on each call and writes `.akrun.json` + `.akproof.json` to `output/`.

## Example envelope

```json
{
  "model": "mistral-large-latest",
  "tools": [{ "type": "function", "function": { "name": "aurekai.publish.brief", "description": "...", "parameters": {} } }],
  "tool_choice": "auto"
}
```

## Proof output

```json
{
  "run_id": "...",
  "provider": "mistral",
  "tool_call_success": true,
  "artifact_uri": "aurekai://proof/mistral/..."
}
```
