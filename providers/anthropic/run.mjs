import { runAnthropicAdapter } from "./adapter.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const input = args.input || "Inspect artifact lineage and provide a proof summary.";
const model = args.model || "claude-3-7-sonnet-latest";
const mcpConfig = args["mcp-config"] || "providers/anthropic/claude-desktop.mcp.example.json";
const outputDir = args.output || "";
const dryRun = Boolean(args["dry-run"]);

try {
  const { result, written } = await runAnthropicAdapter({
    input,
    model,
    mcpConfigPath: mcpConfig,
    outputDir: outputDir || undefined,
    dryRun
  });

  console.log(JSON.stringify({
    status: "ok",
    provider: "anthropic",
    run_id: result.run_id,
    model: result.model,
    tool_count: result.tool_count,
    mcp_servers: result.mcp_servers,
    output_dir: written.output_dir
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
