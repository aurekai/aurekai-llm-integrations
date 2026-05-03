import { runOpenAIAdapter } from "./adapter.mjs";

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

const input = args.input || "Summarize the latest Aurekai provider integration status.";
const model = args.model || "gpt-4.1-mini";
const remoteMcpUrl = args["remote-mcp"] || "";
const remoteMcpLabel = args["remote-mcp-label"] || "aurekai-mcp";
const outputDir = args.output || "";
const dryRun = Boolean(args["dry-run"]);

try {
  const { result, written } = await runOpenAIAdapter({
    input,
    model,
    remoteMcpUrl,
    remoteMcpLabel,
    outputDir: outputDir || undefined,
    dryRun
  });

  console.log(JSON.stringify({
    status: "ok",
    provider: "openai",
    run_id: result.run_id,
    model: result.model,
    tool_count: result.tool_count,
    remote_mcp: result.remote_mcp,
    output_dir: written.output_dir
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
