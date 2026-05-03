import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const providerName = "perplexity";

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
  return path.resolve(repoRoot(), "output", "perplexity");
}

export function buildProviderEnvelope({ input, model = "sonar-pro", searchContextSize = "high" }) {
  return {
    provider: providerName, model, input, search_context_size: searchContextSize,
    proofOutputs: Object.values(OUTPUT_FILES)
  };
}

function citationArtifacts(citations) {
  return citations.map((url, idx) => ({
    artifact_id: "cite-" + (idx + 1),
    source_url: url,
    captured_at: new Date().toISOString()
  }));
}

function estimateCost(tokensIn, tokensOut) {
  return Number(((tokensIn / 1000000 * 3.0) + (tokensOut / 1000000 * 15.0)).toFixed(6));
}

export function writeProofArtifacts(result, outputDir = defaultOutputDir()) {
  fs.mkdirSync(outputDir, { recursive: true });
  const runId = result.run_id;
  const inputHash = crypto.createHash("sha256").update(result.input || "").digest("hex");
  const citeArtifacts = citationArtifacts(result.citations || []);

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.run), JSON.stringify({
    run_id: runId, provider: providerName, model: result.model,
    citation_count: citeArtifacts.length, created_at: new Date().toISOString(), input_hash: inputHash
  }, null, 2) + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.proof), JSON.stringify({
    run_id: runId, status: "complete", proof_version: "1.0.0",
    citations: citeArtifacts, artifacts: Object.values(OUTPUT_FILES)
  }, null, 2) + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.trace),
    result.trace_events.map((e) => JSON.stringify({ ts: new Date().toISOString(), ...e })).join("\n") + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.features), JSON.stringify({
    run_id: runId, semantic_cache_key: inputHash.slice(0, 20),
    feature_tags: ["web-grounded", "citations", "proof-bundle"],
    citation_count: citeArtifacts.length
  }, null, 2) + "\n");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.cost), JSON.stringify({
    run_id: runId, prompt_tokens: result.prompt_tokens,
    completion_tokens: result.completion_tokens,
    total_cost_usd: estimateCost(result.prompt_tokens, result.completion_tokens)
  }, null, 2) + "\n");

  return { output_dir: outputDir, files: OUTPUT_FILES, citation_count: citeArtifacts.length };
}

export async function runPerplexityAdapter({ input, model = "sonar-pro", searchContextSize = "high", outputDir, dryRun = false }) {
  const envelope = buildProviderEnvelope({ input, model, searchContextSize });
  const traceEvents = [{ event: "request.built", model, web_grounded: true }];
  let promptTokens = 220, completionTokens = 180;
  let citations = ["https://aurekai.ai", "https://github.com/aurekai/aurekai"];

  if (!dryRun && process.env.PERPLEXITY_API_KEY) {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + process.env.PERPLEXITY_API_KEY },
      body: JSON.stringify({
        model, stream: false, search_context_size: searchContextSize,
        messages: [{ role: "user", content: input }]
      })
    });
    if (!response.ok) throw new Error("Perplexity request failed (" + response.status + "): " + await response.text());
    const data = await response.json();
    citations = data.citations || citations;
    promptTokens = data.usage?.prompt_tokens || promptTokens;
    completionTokens = data.usage?.completion_tokens || completionTokens;
    traceEvents.push({ event: "response.ok", citation_count: citations.length });
  } else {
    traceEvents.push({ event: "response.mocked", reason: "dry-run or missing PERPLEXITY_API_KEY" });
  }

  traceEvents.push({ event: "citations.captured", count: citations.length });

  const result = {
    run_id: "ak-perplexity-" + Date.now(), input, model, citations,
    prompt_tokens: promptTokens, completion_tokens: completionTokens,
    trace_events: traceEvents
  };
  return { result, written: writeProofArtifacts(result, outputDir) };
}
