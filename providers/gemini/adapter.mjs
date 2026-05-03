import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const providerName = "gemini";

const OUTPUT_FILES = {
  run: ".akrun.json",
  proof: ".akproof.json",
  trace: ".aktrace.jsonl",
  features: ".akfeatures.json",
  cost: ".akcost.json"
};

function repoRoot() {
  const selfDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(selfDir, "../../");
}

function defaultOutputDir() {
  return path.resolve(repoRoot(), "output", "gemini");
}

export function loadGeminiTools() {
  const schemaPath = path.resolve(repoRoot(), "schemas/gemini-tools.json");
  const data = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  return data.function_declarations || [];
}

export function buildProviderEnvelope({ input, model = "gemini-2.5-pro", tools, geminiCacheId }) {
  const toolList = tools || loadGeminiTools();
  return {
    provider: providerName,
    model,
    input,
    tools: toolList,
    gemini_cache_id: geminiCacheId,
    proofOutputs: Object.values(OUTPUT_FILES)
  };
}

function estimateCost(tokensIn, tokensOut) {
  const inCost = (tokensIn / 1000000) * 1.25;
  const outCost = (tokensOut / 1000000) * 5.0;
  return Number((inCost + outCost).toFixed(6));
}

export function writeProofArtifacts(result, outputDir = defaultOutputDir()) {
  fs.mkdirSync(outputDir, { recursive: true });

  const runId = result.run_id || `gemini-${Date.now()}`;

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.run), `${JSON.stringify({
    run_id: runId,
    provider: providerName,
    model: result.model,
    gemini_cache_id: result.gemini_cache_id,
    semantic_cache_key: result.semantic_cache_key,
    created_at: new Date().toISOString()
  }, null, 2)}\n`);

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.proof), `${JSON.stringify({
    run_id: runId,
    status: "complete",
    proof_version: "1.0.0",
    bridge: "gemini-context-cache + aurekai-semantic-cache",
    artifacts: Object.values(OUTPUT_FILES)
  }, null, 2)}\n`);

  const traceLines = result.trace_events
    .map((event) => JSON.stringify({ ts: new Date().toISOString(), ...event }))
    .join("\n");
  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.trace), `${traceLines}\n`);

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.features), `${JSON.stringify({
    run_id: runId,
    semantic_cache_key: result.semantic_cache_key,
    gemini_cache_id: result.gemini_cache_id,
    feature_tags: ["context-cache-bridge", "semantic-cache", "proof-bundle"]
  }, null, 2)}\n`);

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.cost), `${JSON.stringify({
    run_id: runId,
    prompt_tokens: result.prompt_tokens,
    completion_tokens: result.completion_tokens,
    total_cost_usd: estimateCost(result.prompt_tokens, result.completion_tokens)
  }, null, 2)}\n`);

  return { output_dir: outputDir, files: OUTPUT_FILES };
}

export async function runGeminiAdapter({
  input,
  model = "gemini-2.5-pro",
  geminiCacheId,
  outputDir,
  dryRun = false
}) {
  const semanticCacheKey = crypto
    .createHash("sha256")
    .update(`${input}:${geminiCacheId || "none"}`)
    .digest("hex")
    .slice(0, 24);

  const envelope = buildProviderEnvelope({ input, model, geminiCacheId });
  const traceEvents = [
    { event: "request.built", model, tool_count: envelope.tools.length },
    { event: "cache.bridge", gemini_cache_id: geminiCacheId || null, semantic_cache_key: semanticCacheKey }
  ];

  let promptTokens = 260;
  let completionTokens = 160;

  if (!dryRun && process.env.GEMINI_API_KEY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: input }] }],
        tools: [{ functionDeclarations: envelope.tools }]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${body}`);
    }

    const payload = await response.json();
    promptTokens = payload.usageMetadata?.promptTokenCount || promptTokens;
    completionTokens = payload.usageMetadata?.candidatesTokenCount || completionTokens;
    traceEvents.push({ event: "response.ok" });
  } else {
    traceEvents.push({ event: "response.mocked", reason: "dry-run or missing GEMINI_API_KEY" });
  }

  const result = {
    run_id: `ak-gemini-${Date.now()}`,
    input,
    model,
    gemini_cache_id: geminiCacheId || null,
    semantic_cache_key: semanticCacheKey,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    trace_events: traceEvents
  };

  const written = writeProofArtifacts(result, outputDir);
  return { result, written };
}
