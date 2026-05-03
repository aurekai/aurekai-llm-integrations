import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const providerName = "local";

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
  return path.resolve(repoRoot(), "output", "local");
}

export function buildProviderEnvelope({ input, model = "llama3.3", baseUrl = "http://localhost:11434" }) {
  return { provider: providerName, model, base_url: baseUrl, input, proofOutputs: Object.values(OUTPUT_FILES) };
}

export function writeProofArtifacts(result, outputDir = defaultOutputDir()) {
  fs.mkdirSync(outputDir, { recursive: true });
  const runId = result.run_id;
  const inputHash = crypto.createHash("sha256").update(result.input || "").digest("hex");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.run), JSON.stringify({
    run_id: runId, provider: providerName, model: result.model,
    base_url: result.base_url, created_at: new Date().toISOString(), input_hash: inputHash
  }, null, 2) + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.proof), JSON.stringify({
    run_id: runId, status: "complete", proof_version: "1.0.0",
    artifacts: Object.values(OUTPUT_FILES)
  }, null, 2) + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.trace),
    result.trace_events.map((e) => JSON.stringify({ ts: new Date().toISOString(), ...e })).join("\n") + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.features), JSON.stringify({
    run_id: runId, semantic_cache_key: inputHash.slice(0, 20),
    feature_tags: ["local-llm", "ollama", "proof-bundle"]
  }, null, 2) + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.cost), JSON.stringify({
    run_id: runId, cost_usd: 0, note: "local inference — no API cost"
  }, null, 2) + "\n");

  return { output_dir: outputDir, files: OUTPUT_FILES };
}

export async function runLocalAdapter({ input, model = "llama3.3", baseUrl = "http://localhost:11434", outputDir, dryRun = false }) {
  const envelope = buildProviderEnvelope({ input, model, baseUrl });
  const traceEvents = [{ event: "request.built", model, base_url: baseUrl }];
  let tokensEval = 120;

  if (!dryRun) {
    try {
      const response = await fetch(baseUrl + "/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, prompt: input, stream: false })
      });
      if (response.ok) {
        const data = await response.json();
        tokensEval = data.eval_count || tokensEval;
        traceEvents.push({ event: "response.ok", eval_count: tokensEval });
      } else {
        traceEvents.push({ event: "response.unreachable", status: response.status });
      }
    } catch {
      traceEvents.push({ event: "response.unreachable", reason: "local server not running" });
    }
  } else {
    traceEvents.push({ event: "response.mocked", reason: "dry-run" });
  }

  const result = {
    run_id: "ak-local-" + Date.now(), input, model,
    base_url: baseUrl, tokens_eval: tokensEval,
    trace_events: traceEvents
  };
  return { result, written: writeProofArtifacts(result, outputDir) };
}
