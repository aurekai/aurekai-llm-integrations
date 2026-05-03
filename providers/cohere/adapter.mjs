import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const providerName = "cohere";

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
  return path.resolve(repoRoot(), "output", "cohere");
}

export function buildProviderEnvelope({ query, documents, model = "rerank-v3.5" }) {
  return { provider: providerName, model, query, documents, proofOutputs: Object.values(OUTPUT_FILES) };
}

function estimateCost(docCount) {
  return Number((docCount * 0.000002).toFixed(6));
}

export function writeProofArtifacts(result, outputDir = defaultOutputDir()) {
  fs.mkdirSync(outputDir, { recursive: true });
  const runId = result.run_id;
  const queryHash = crypto.createHash("sha256").update(result.query || "").digest("hex");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.run), JSON.stringify({
    run_id: runId, provider: providerName, model: result.model,
    mode: result.mode, doc_count: result.doc_count,
    created_at: new Date().toISOString(), query_hash: queryHash
  }, null, 2) + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.proof), JSON.stringify({
    run_id: runId, status: "complete", proof_version: "1.0.0",
    mode: result.mode, artifacts: Object.values(OUTPUT_FILES)
  }, null, 2) + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.trace),
    result.trace_events.map((e) => JSON.stringify({ ts: new Date().toISOString(), ...e })).join("\n") + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.features), JSON.stringify({
    run_id: runId, semantic_cache_key: queryHash.slice(0, 20),
    feature_tags: ["rerank", "embedding-bridge", "sae-benchmark", "proof-bundle"],
    mode: result.mode
  }, null, 2) + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.cost), JSON.stringify({
    run_id: runId, doc_count: result.doc_count,
    total_cost_usd: estimateCost(result.doc_count)
  }, null, 2) + "\n");

  return { output_dir: outputDir, files: OUTPUT_FILES };
}

export async function runCohereAdapter({ query, documents, model = "rerank-v3.5", mode = "rerank", outputDir, dryRun = false }) {
  const defaultDocs = [
    "Aurekai integrates with all major model providers.",
    "Aurekai provides semantic cache and proof bundles.",
    "Cohere rerank surface for SAE benchmark comparison."
  ];
  const docs = documents || defaultDocs;
  const envelope = buildProviderEnvelope({ query, documents: docs, model });
  const traceEvents = [{ event: "request.built", model, mode, doc_count: docs.length }];
  let results = docs.map((d, i) => ({ index: i, relevance_score: 0.9 - i * 0.1 }));

  if (!dryRun && process.env.COHERE_API_KEY) {
    const response = await fetch("https://api.cohere.com/v1/rerank", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + process.env.COHERE_API_KEY },
      body: JSON.stringify({ model, query, documents: docs, top_n: docs.length })
    });
    if (!response.ok) throw new Error("Cohere request failed (" + response.status + "): " + await response.text());
    const data = await response.json();
    results = data.results || results;
    traceEvents.push({ event: "response.ok", result_count: results.length });
  } else {
    traceEvents.push({ event: "response.mocked", reason: "dry-run or missing COHERE_API_KEY" });
  }

  traceEvents.push({ event: "rerank.complete", top_score: results[0]?.relevance_score });

  const result = {
    run_id: "ak-cohere-" + Date.now(), query, model, mode,
    doc_count: docs.length, results, trace_events: traceEvents
  };
  return { result, written: writeProofArtifacts(result, outputDir) };
}
