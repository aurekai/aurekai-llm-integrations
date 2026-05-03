# Local LLM Stack Demo (Ollama / llama.cpp / GGUF)

Goal: Run Aurekai tool calls fully offline using a local GGUF model via Ollama or llama.cpp.

```bash
npm run local:demo
node providers/local/run.mjs --dry-run
```

## Prerequisites

- Ollama running locally (`ollama serve`) with a tool-capable model (e.g. `llama3.1`, `mistral-nemo`)
- OR llama.cpp server (`llama-server --host 127.0.0.1 --port 8080 --model model.gguf`)

## How it works

The local adapter binds to `schemas/local-tools.json` (48 tools, OpenAI-compatible function format)
and routes to `http://localhost:11434/api/chat` (Ollama) or `http://localhost:8080/v1/chat/completions` (llama.cpp).
All proof artifacts are written locally — no external API calls.

## Example: Ollama

```bash
ollama pull llama3.1
AUREKAI_LOCAL_BACKEND=ollama AUREKAI_LOCAL_MODEL=llama3.1 node providers/local/run.mjs --dry-run
```

## Example: llama.cpp

```bash
llama-server --host 127.0.0.1 --port 8080 --model ~/models/mistral-7b.gguf
AUREKAI_LOCAL_BACKEND=llamacpp node providers/local/run.mjs --dry-run
```

## Proof output

```json
{
  "run_id": "...",
  "provider": "local",
  "backend": "ollama",
  "model": "llama3.1",
  "tool_call_success": true,
  "artifact_uri": "aurekai://proof/local/..."
}
```
