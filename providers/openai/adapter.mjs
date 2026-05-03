import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const providerName = "openai";

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
  return path.resolve(repoRoot(), "output", "openai");
}

export function loadOpenAITools() {
  const schemaPath = path.resolve(repoRoot(), "schemas/openai-tools.json");
  const data = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  return data.tools || [];
}

export function buildRemoteMcpTool(remoteMcpUrl, label = "aurekai-mcp") {
  if (!remoteMcpUrl) return null;
  return {
    type: "mcp",
    server_label: label,
    server_url: remoteMcpUrl,
    require_approval: "never"
  };
}

export function buildProviderEnvelope({
  input,
  model = "gpt-4.1-mini",
  remoteMcpUrl,
  remoteMcpLabel,
  tools
}) {
  const toolList = tools || loadOpenAITools();
  const mcpTool = buildRemoteMcpTool(remoteMcpUrl, remoteMcpLabel);
  const finalTools = mcpTool ? [...toolList, mcpTool] : toolList;

  return {
    provider: providerName,
    model,
    input,
    tools: finalTools,
    proofOutputs: Object.values(OUTPUT_FILES)
  };
}

function mockToolTrace(toolList) {
  return toolList
    .filter((item) => item.type === "function")
    .slice(0, 2)
    .map((item, idx) => ({
      event: "tool.call",
      tool: item.function?.name || "unknown",
      call_id: `mock-call-${idx + 1}`,
      status: "ok"
    }));
}

function estimateCost(tokensIn, tokensOut) {
  const inCost = (tokensIn / 1000000) * 0.8;
  const outCost = (tokensOut / 1000000) * 2.4;
  return Number((inCost + outCost).toFixed(6));
}

export function writeProofArtifacts(result, outputDir = defaultOutputDir()) {
  fs.mkdirSync(outputDir, { recursive: true });

  const runId = result.run_id || `openai-${Date.now()}`;
  const inputHash = crypto.createHash("sha256").update(result.input || "").digest("hex");

  const runPayload = {
    run_id: runId,
    provider: providerName,
    model: result.model,
    created_at: new Date().toISOString(),
    tool_count: result.tool_count,
    remote_mcp: result.remote_mcp || null,
    input_hash: inputHash
  };

  const proofPayload = {
    run_id: runId,
    artifacts: [OUTPUT_FILES.run, OUTPUT_FILES.proof, OUTPUT_FILES.trace, OUTPUT_FILES.features, OUTPUT_FILES.cost],
    status: "complete",
    proof_version: "1.0.0"
  };

  const traceLines = result.trace_events
    .map((event) => JSON.stringify({ ts: new Date().toISOString(), ...event }))
    .join("\n");

  const featuresPayload = {
    run_id: runId,
    semantic_cache_key: inputHash.slice(0, 20),
    feature_tags: ["tool-calling", "proof-bundle", "model-memory"],
    remote_mcp: Boolean(result.remote_mcp)
  };

  const costPayload = {
    run_id: runId,
    prompt_tokens: result.prompt_tokens,
    completion_tokens: result.completion_tokens,
    total_cost_usd: estimateCost(result.prompt_tokens, result.completion_tokens)
  };

  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.run), `${JSON.stringify(runPayload, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.proof), `${JSON.stringify(proofPayload, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.trace), `${traceLines}\n`);
  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.features), `${JSON.stringify(featuresPayload, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, OUTPUT_FILES.cost), `${JSON.stringify(costPayload, null, 2)}\n`);

  return {
    output_dir: outputDir,
    files: OUTPUT_FILES
  };
}

export async function runOpenAIAdapter({
  input,
  model = "gpt-4.1-mini",
  remoteMcpUrl,
  remoteMcpLabel,
  outputDir,
  dryRun = false
}) {
  const envelope = buildProviderEnvelope({ input, model, remoteMcpUrl, remoteMcpLabel });
  const traceEvents = [{ event: "request.built", model, tool_count: envelope.tools.length }];

  let promptTokens = 220;
  let completionTokens = 180;

  if (!dryRun && process.env.OPENAI_API_KEY) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        input,
        tools: envelope.tools
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${body}`);
    }

    const payload = await response.json();
    promptTokens = payload.usage?.input_tokens || promptTokens;
    completionTokens = payload.usage?.output_tokens || completionTokens;
    traceEvents.push({ event: "response.ok", response_id: payload.id || null });
  } else {
    traceEvents.push({ event: "response.mocked", reason: "dry-run or missing OPENAI_API_KEY" });
  }

  traceEvents.push(...mockToolTrace(envelope.tools));

  const result = {
    run_id: `ak-openai-${Date.now()}`,
    input,
    model,
    tool_count: envelope.tools.length,
    remote_mcp: remoteMcpUrl || null,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    trace_events: traceEvents
  };

  const written = writeProofArtifacts(result, outputDir);
  return { result, written };
}
