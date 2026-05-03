<p align="center">
  <img src="https://raw.githubusercontent.com/aurekai/aurekai/main/assets/aurekai-logo.svg" alt="Aurekai" width="520" />
</p>

# Aurekai LLM Integrations

Provider-neutral integration layer that exposes Aurekai runtime, proof, memory, artifact, and semantic-cache primitives to major model providers.

## Coverage Model

Each provider adapter implements the same five surfaces:

1. Tool calling adapter
2. Remote MCP server bridge
3. Provider workflow template
4. Batch and eval connector
5. Semantic cache and model-memory hook

## Providers

- OpenAI
- Anthropic
- Gemini (Google and Vertex AI)
- Mistral
- Groq
- xAI
- Perplexity
- Cohere
- Local Llama stacks

## Monorepo Layout

- providers/: provider adapters, manifests, and README docs
- gateway/: provider routing and capability registry
- schemas/: canonical tool schema and provider-specific generated schemas
- evals/: cross-provider benchmark harness
- examples/: killer demos for highest-value integrations
- docs/: architecture, roadmap, and matrix docs

## Quick Start

```bash
npm install
npm run schemas:generate
npm run gateway:demo
npm run evals:run
```

## Core Tool Family

- aurekai.doctor
- aurekai.verify_manifest
- aurekai.inspect_artifact
- aurekai.query_features
- aurekai.semantic_search
- aurekai.model_memory_lookup
- aurekai.export_proof_bundle
- aurekai.run_recipe
- aurekai.cache_lookup
- aurekai.cache_put
- aurekai.feature_gate
