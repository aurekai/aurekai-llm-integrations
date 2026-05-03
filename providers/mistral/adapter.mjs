import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const providerName = "mistral";

const OUTPUT_FILES = {
  run: ".akrun.json",
  proof: ".akproof.json",
  trace: ".aktrace.jsonl",
  features: ".akfeatures.json",
  cost: ".akcost.json"
};

function repoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../");
}

function defaultOutputDir() {
  return path.resolve(repoRoot(), "output", "mistral");
}

export function loadMistralTools() {
  const data = JSON.parse(fs.readFileSync(path.resolve(repoRoot(), "schemas/mistral-tools.json"), "utf8"));
  return data.functions || [];
}

export function buildManagedConnector(mcpUrl, label = "aurekai-mcp") {
  if (!mcpUrl) return null;
  return { type: "mcp", server_label: label, server_url: mcpUrl };
}

export function buildProviderEnvelope({ input, model = "mistral-medium-3", mcpUrl, tools }) {
  const toolList = tools || loadMistralTools();
  const mcpConnector = buildManagedConnector(mcpUrl);
  return {
    provider: providerName, model, input,
    tools: toolList.map((fn) => ({ type: "function", function: fn })),
    connector: mcpConnector,
    proofOutputs: Object.values(OUTPUT_FILES)
  };
}

function estimateCost(tokensIn, tokensOut) {
  return Number(((tokensIn / 1000000 * 0.4) + (tokensOut / 1000000 * 2.0)).toFixed(6));
}

export function writeProofArtifacts(result, outputDir = defaultOutputDir()) {
  fs.mkdirSync(outputDir, { recursive: true });
  const runId = result.run_id;
  const inputHash = crypto.createHash("sha256").update(result.input || "").digest("hex");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.run), JSON.stringify({
    run_id: runId, provider: providerName, model: result.model,
    managed_connector: result.managed_connector,
    created_at: new Date().toISOString(), input_hash: inputHash
  }, null, 2) + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.proof), JSON.stringify({
    run_id: runId, status: "complete", proof_version: "1.0.0",
    artifacts: Object.values(OUTPUT_FILES)
  }, null, 2) + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.trace),
    result.trace_events.map((e) => JSON.stringify({ ts: new Date().toISOString(), ...e })).join("\n") + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.features), JSON.stringify({
    run_id: runId, semantic_cache_key: inputHash.slice(0, 20),
    feature_tags: ["agent-connector", "managed-mcp", "proof-bundle"]
  }, null, 2) + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.cost), JSON.stringify({
    run_id: runId, prompt_tokens: result.prompt_tokens,
    completion_tokens: result.completion_tokens,
    total_cost_usd: estimateCost(result.prompt_tokens, result.completion_tokens)
  }, null, 2) + "\n");

  return { output_dir: outputDir, files: OUTPUT_FILES };
}

export async function runMistralAdapter({ input, model = "mistral-medium-3", mcpUrl, outputDir, dryRun = false }) {
  const envelope = buildProviderEnvelope({ input, model, mcpUrl });
  const traceEvents = [{ event: "request.built", model, tool_count: envelope.tools.length }];
  let promptTokens = 225, completionTokens = 155;

  if (!dryRun && process.env.MISTRAL_API_KEY) {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + process.env.MISTRAL_API_KEY },
      body: JSON.stringify({ model, messages: [{ role: "user", content: input }], tools: envelope.tools })
    });
    if (!response.ok) throw new Error("Mistral request failed (" + response.status + "): " + await response.text());
    const data = await response.json();
    promptTokens = data.usage?.prompt_tokens || promptTokens;
    completionTokens = data.usage?.completion_tokens || completionTokens;
    traceEvents.push({ event: "response.ok", id: data.id || null });
  } else {
    traceEvents.push({ event: "response.mocked", reason: "dry-run or missing MISTRAL_API_KEY" });
  }

  const result = {
    run_id: "ak-mistral-" + Date.now(), input, model,
    managed_connector: mcpUrl || null,
    prompt_tokens: promptTokens, completion_tokens: completionTokens,
    trace_events: traceEvents
  };
  return { result, written: writeProofArtifacts(result, outputDir) };
}
