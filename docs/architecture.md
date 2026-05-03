# Architecture

Aurekai LLM integrations use one canonical tool contract and fan out to provider-specific schemas.

Flow:

1. Canonical tool contract in schemas/aurekai-tools.canonical.json
2. Provider schema generation in scripts/generate-provider-schemas.mjs
3. Gateway capability routing in gateway/capability-registry.json
4. Provider adapter execution in providers/*/adapter.mjs
5. Proof and trace persistence in run artifacts
