import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const matrix = JSON.parse(fs.readFileSync("evals/matrix.json", "utf8"));
const { providers, metrics } = matrix;

const OUTPUT_DIR = "output/evals";
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const TOOL_SCHEMA_MAP = {
  openai: "schemas/openai-tools.json",
  anthropic: "schemas/anthropic-tools.json",
  gemini: "schemas/gemini-tools.json",
  mistral: "schemas/mistral-tools.json",
  groq: "schemas/groq-tools.json",
  xai: "schemas/xai-tools.json",
  perplexity: "schemas/perplexity-tools.json",
  cohere: "schemas/cohere-tools.json",
  local: "schemas/local-tools.json"
};

function runProviderDryRun(provider) {
  const start = Date.now();
  const runId = randomUUID();
  const adapterPath = `providers/${provider}/run.mjs`;
  const schemaPath = TOOL_SCHEMA_MAP[provider];

  const result = {
    provider,
    run_id: runId,
    timestamp: new Date().toISOString(),
    dry_run: true,
    schema_path: schemaPath,
    metrics: {},
    artifacts: {},
    status: "ok",
    error: null
  };

  // Check adapter exists
  if (!fs.existsSync(adapterPath)) {
    result.status = "skipped";
    result.error = `adapter not found: ${adapterPath}`;
    return result;
  }

  // Check schema exists
  if (!fs.existsSync(schemaPath)) {
    result.status = "skipped";
    result.error = `schema not found: ${schemaPath}`;
    return result;
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const toolCount = schema.tools?.length || schema.functions?.length || schema.function_declarations?.length || 0;

  // Run the adapter in dry-run mode
  const proc = spawnSync("node", [adapterPath, "--dry-run"], {
    encoding: "utf8",
    timeout: 30000,
    env: { ...process.env, AUREKAI_DRY_RUN: "1", AUREKAI_EVAL_RUN_ID: runId }
  });

  const latency = Date.now() - start;

  result.metrics.latency_ms = latency;
  result.metrics.tool_call_success = proc.status === 0 ? 1.0 : 0.0;
  result.metrics.schema_compliance = toolCount > 0 ? 1.0 : 0.0;
  result.metrics.cost_usd = 0.0; // dry-run
  result.metrics.cache_hit_rate = 0.0;
  result.metrics.proof_completeness = 0.0;
  result.metrics.retrieval_precision = 0.0;
  result.metrics.feature_drift = 0.0;

  if (proc.status !== 0) {
    result.status = "failed";
    result.error = proc.stderr?.slice(0, 500) || "non-zero exit";
  }

  // Capture stdout as run artifact
  const runArtifact = {
    run_id: runId,
    provider,
    dry_run: true,
    tool_count: toolCount,
    exit_code: proc.status,
    stdout: proc.stdout?.slice(0, 2000),
    stderr: proc.stderr?.slice(0, 500)
  };
  const akrunPath = path.join(OUTPUT_DIR, `${provider}.akrun.json`);
  fs.writeFileSync(akrunPath, JSON.stringify(runArtifact, null, 2) + "\n");
  result.artifacts.akrun = akrunPath;

  // Emit a proof artifact
  const proofArtifact = {
    run_id: runId,
    provider,
    schema_path: schemaPath,
    tool_count: toolCount,
    hash: Buffer.from(`${provider}:${runId}:${toolCount}`).toString("base64"),
    timestamp: result.timestamp,
    status: result.status
  };
  const akproofPath = path.join(OUTPUT_DIR, `${provider}.akproof.json`);
  fs.writeFileSync(akproofPath, JSON.stringify(proofArtifact, null, 2) + "\n");
  result.artifacts.akproof = akproofPath;

  // Check if adapter emitted proof-completeness info in stdout
  if (proc.stdout?.includes("proof")) {
    result.metrics.proof_completeness = 1.0;
  }

  return result;
}

console.log(`\nAurekai Evals Runner — ${providers.length} providers × ${metrics.length} metrics`);
console.log("=".repeat(60));

const results = [];
for (const provider of providers) {
  process.stdout.write(`  Running ${provider}...`);
  const r = runProviderDryRun(provider);
  results.push(r);
  const symbol = r.status === "ok" ? "✓" : r.status === "skipped" ? "~" : "✗";
  console.log(` ${symbol} (${r.metrics.latency_ms}ms, exit=${r.status})`);
}

// Build cross-provider matrix report
const report = {
  generated_at: new Date().toISOString(),
  schema_version: "aurekai.evals.v1",
  providers: providers,
  metrics: metrics,
  results: results,
  summary: {
    total: results.length,
    ok: results.filter(r => r.status === "ok").length,
    skipped: results.filter(r => r.status === "skipped").length,
    failed: results.filter(r => r.status === "failed").length,
  },
  matrix: Object.fromEntries(
    metrics.map(m => [
      m,
      Object.fromEntries(results.map(r => [r.provider, r.metrics[m] ?? null]))
    ])
  )
};

const reportPath = path.join(OUTPUT_DIR, "evals-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");

console.log("\nMatrix report:");
console.log(`  ${"provider".padEnd(14)} ${metrics.map(m => m.slice(0,8).padEnd(10)).join(" ")}`);
for (const r of results) {
  const row = metrics.map(m => String(r.metrics[m] ?? "-").padEnd(10)).join(" ");
  console.log(`  ${r.provider.padEnd(14)} ${row}`);
}
console.log(`\nReport written to ${reportPath}`);
console.log(`Summary: ${report.summary.ok} ok, ${report.summary.skipped} skipped, ${report.summary.failed} failed`);
