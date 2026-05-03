// SPDX-License-Identifier: Apache-2.0
// Aurekai gateway — capability-based router, wired to all 9 provider adapters
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildOpenaiRequest } from "./providers/openai.mjs";
import { buildAnthropicRequest } from "./providers/anthropic.mjs";
import { buildGeminiRequest } from "./providers/gemini.mjs";
import { buildGroqRequest } from "./providers/groq.mjs";
import { buildPerplexityRequest } from "./providers/perplexity.mjs";
import { buildMistralRequest } from "./providers/mistral.mjs";
import { buildXaiRequest } from "./providers/xai.mjs";
import { buildCohereRequest } from "./providers/cohere.mjs";
import { buildLocalRequest } from "./providers/local.mjs";

const __dir = path.dirname(fileURLToPath(import.meta.url));

const capabilities = JSON.parse(
  fs.readFileSync(path.resolve(__dir, "capability-registry.json"), "utf8")
);
const canonical = JSON.parse(
  fs.readFileSync(path.resolve(__dir, "../schemas/aurekai-tools.canonical.json"), "utf8")
);

const BUILDERS = {
  openai: buildOpenaiRequest,
  anthropic: buildAnthropicRequest,
  gemini: buildGeminiRequest,
  groq: buildGroqRequest,
  perplexity: buildPerplexityRequest,
  mistral: buildMistralRequest,
  xai: buildXaiRequest,
  cohere: buildCohereRequest,
  local: buildLocalRequest,
};

/** Choose the first provider whose capability set satisfies all requirements. */
export function chooseProvider(requirements = []) {
  for (const [name, caps] of Object.entries(capabilities)) {
    if (requirements.every((k) => Boolean(caps[k]))) return name;
  }
  return "openai";
}

/**
 * Build a provider-native request envelope routed by capability requirements.
 *
 * @param {string} input   - user prompt / query
 * @param {object} opts
 * @param {string[]} [opts.require]  - capability keys the provider must have
 * @param {string}   [opts.provider] - force a specific provider
 * @param {object}   [opts.providerOpts] - passed through to the provider builder
 */
export async function gatewayRequest(input, { require = [], provider, providerOpts = {} } = {}) {
  const name = provider || chooseProvider(require);
  const builder = BUILDERS[name];
  if (!builder) throw new Error(`Unknown provider: ${name}`);
  const envelope = await builder(input, providerOpts);
  return { provider: name, envelope, canonical_tool_count: canonical.tools.length };
}

// ── Demo ─────────────────────────────────────────────────────────────────────
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const demos = [
    { label: "function_calling + batch", require: ["function_calling", "batch"] },
    { label: "web_grounded",             require: ["web_grounded"] },
    { label: "rerank",                   require: ["rerank"] },
    { label: "low_latency",              require: ["low_latency"] },
    { label: "local",                    require: ["ollama"] },
  ];

  for (const { label, require } of demos) {
    const res = await gatewayRequest("aurekai.doctor check", { require });
    console.log(`[${label}] → ${res.provider}  (${res.canonical_tool_count} canonical tools)`);
  }
}
