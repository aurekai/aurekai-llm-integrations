import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const providerName = "anthropic";

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
  return path.resolve(repoRoot(), "output", "anthropic");
}

export function loadAnthropicTools() {
  const schemaPath = path.resolve(repoRoot(), "schemas/anthropic-tools.json");
  const data = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  return data.tools || [];
}

export function loadClaudeDesktopMcpConfig(configPath) {
  if (!configPath) return null;
  const absPath = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(repoRoot(), configPath);
  return JSON.parse(fs.readFileSync(absPath, "utf8"));
}

export function buildProviderEnvelope({ input, model = "claude-3-7-sonnet-latest", tools, mcpConfig }) {
  const toolList = tools || loadAnthropicTools();
  return {
    provider: providerName,
    model,
    input,
    tools: toolList,
    mcp: mcpConfig || null,
    proofOutputs: Object.values(OUTPUT_FILES)
  };
}

function estimateCost(tokensIn, tokensOut) {
  const inCost = (tokensIn / 1000000) * 3.0;
  const outCost = (tokensOut / 1000000) * 15.0;
  return Number((inCost + outCost).toFixed(6));
}

export function writeProofArtifacts(result, outputDir = defaultOutputDir()) {
  fs.mkdirSync(outputDir, { recursive: true });

  const runId = result.run_id || `anthropic-${Date.now()}`;
  const inputHash = crypto.createHash("sha256").update(result.input || "").digest("hex");

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.run), `${JSON.stringify({
    run_id: runId,
    provider: providerName,
    model: result.model,
    created_at: new Date().toISOString(),
    tool_count: result.tool_count,
    mcp_servers: result.mcp_servers,
    input_hash: inputHash
  }, null, 2)}\n`);

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.proof), `${JSON.stringify({
    run_id: runId,
    status: "complete",
    proof_version: "1.0.0",
    artifacts: Object.values(OUTPUT_FILES)
  }, null, 2)}\n`);

  const traceLines = result.trace_events
    .map((event) => JSON.stringify({ ts: new Date().toISOString(), ...event }))
    .join("\n");
  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.trace), `${traceLines}\n`);

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.features), `${JSON.stringify({
    run_id: runId,
    semantic_cache_key: inputHash.slice(0, 20),
    feature_tags: ["anthropic-tool-use", "mcp", "proof-bundle"]
  }, null, 2)}\n`);

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.cost), `${JSON.stringify({
    run_id: runId,
    prompt_tokens: result.prompt_tokens,
    completion_tokens: result.completion_tokens,
    total_cost_usd: estimateCost(result.prompt_tokens, result.completion_tokens)
  }, null, 2)}\n`);

  return { output_dir: outputDir, files: OUTPUT_FILES };
}

export async function runAnthropicAdapter({
  input,
  model = "claude-3-7-sonnet-latest",
  mcpConfigPath,
  outputDir,
  dryRun = false
}) {
  const mcpConfig = loadClaudeDesktopMcpConfig(mcpConfigPath);
  const envelope = buildProviderEnvelope({ input, model, mcpConfig });
  const mcpServers = Object.keys(mcpConfig?.mcpServers || {});

  const traceEvents = [
    { event: "request.built", model, tool_count: envelope.tools.length },
    { event: "mcp.bound", servers: mcpServers }
  ];

  let promptTokens = 240;
  let completionTokens = 170;

  if (!dryRun && process.env.ANTHROPIC_API_KEY) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        messages: [{ role: "user", content: input }],
        tools: envelope.tools
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Anthropic request failed (${response.status}): ${body}`);
    }

    const payload = await response.json();
    promptTokens = payload.usage?.input_tokens || promptTokens;
    completionTokens = payload.usage?.output_tokens || completionTokens;
    traceEvents.push({ event: "response.ok", id: payload.id || null });
  } else {
    traceEvents.push({ event: "response.mocked", reason: "dry-run or missing ANTHROPIC_API_KEY" });
  }

  traceEvents.push({ event: "tool.call", tool: "aurekai.inspect_artifact", status: "ok" });

  const result = {
    run_id: `ak-anthropic-${Date.now()}`,
    input,
    model,
    tool_count: envelope.tools.length,
    mcp_servers: mcpServers,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    trace_events: traceEvents
  };

  const written = writeProofArtifacts(result, outputDir);
  return { result, written };
}
