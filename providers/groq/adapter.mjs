import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const providerName = "groq";

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
  return path.resolve(repoRoot(), "output", "groq");
}

export function loadGroqTools() {
  const data = JSON.parse(fs.readFileSync(path.resolve(repoRoot(), "schemas/groq-tools.json"), "utf8"));
  return data.functions || [];
}

export function buildRemoteMcpConfig(serverUrl, label = "aurekai-mcp") {
  if (!serverUrl) return null;
  return { server_label: label, server_url: serverUrl };
}

export function buildProviderEnvelope({ input, model = "moonshard-80b-8192", remoteMcpUrl, tools }) {
  const toolList = tools || loadGroqTools();
  return {
    provider: providerName,
    model,
    input,
    tools: toolList.map((fn) => ({ type: "function", function: fn })),
    remote_mcp: buildRemoteMcpConfig(remoteMcpUrl),
    proofOutputs: Object.values(OUTPUT_FILES)
  };
}

function estimateCost(tokensIn, tokensOut) {
  return Number(((tokensIn + tokensOut) / 1000000 * 0.27).toFixed(6));
}

export function writeProofArtifacts(result, outputDir = defaultOutputDir()) {
  fs.mkdirSync(outputDir, { recursive: true });
  const runId = result.run_id;
  const inputHash = crypto.createHash("sha256").update(result.input || "").digest("hex");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.run), JSON.stringify({
    run_id: runId, provider: providerName, model: result.model,
    remote_mcp: result.remote_mcp, latency_ms: result.latency_ms,
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
    feature_tags: ["low-latency", "remote-mcp", "proof-bundle"],
    latency_ms: result.latency_ms
  }, null, 2) + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.cost), JSON.stringify({
    run_id: runId, prompt_tokens: result.prompt_tokens,
    completion_tokens: result.completion_tokens,
    total_cost_usd: estimateCost(result.prompt_tokens, result.completion_tokens)
  }, null, 2) + "\n");

  return { output_dir: outputDir, files: OUTPUT_FILES };
}

export async function runGroqAdapter({ input, model = "moonshard-80b-8192", remoteMcpUrl, outputDir, dryRun = false }) {
  const envelope = buildProviderEnvelope({ input, model, remoteMcpUrl });
  const t0 = Date.now();
  const traceEvents = [{ event: "request.built", model, tool_count: envelope.tools.length }];

  let promptTokens = 210, completionTokens = 140;

  if (!dryRun && process.env.GROQ_API_KEY) {
    const payload = { model, messages: [{ role: "user", content: input }], tools: envelope.tools };
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + process.env.GROQ_API_KEY },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("Groq request failed (" + response.status + "): " + await response.text());
    const data = await response.json();
    promptTokens = data.usage?.prompt_tokens || promptTokens;
    completionTokens = data.usage?.completion_tokens || completionTokens;
    traceEvents.push({ event: "response.ok", id: data.id || null });
  } else {
    traceEvents.push({ event: "response.mocked", reason: "dry-run or missing GROQ_API_KEY" });
  }

  const latencyMs = Date.now() - t0;
  traceEvents.push({ event: "latency.measured", latency_ms: latencyMs });

  const result = {
    run_id: "ak-groq-" + Date.now(), input, model,
    remote_mcp: remoteMcpUrl || null, latency_ms: latencyMs,
    prompt_tokens: promptTokens, completion_tokens: completionTokens,
    trace_events: traceEvents
  };
  return { result, written: writeProofArtifacts(result, outputDir) };
}
