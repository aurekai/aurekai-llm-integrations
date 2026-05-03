import { runGroqAdapter } from "./adapter.mjs";
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i]; if (!t.startsWith("--")) continue;
    const k = t.slice(2), n = argv[i+1];
    if (!n || n.startsWith("--")) { args[k] = true; } else { args[k] = n; i++; }
  }
  return args;
}
const a = parseArgs(process.argv.slice(2));
const { result, written } = await runGroqAdapter({
  input: a.input || "Run aurekai.feature_gate check with latency budget 800ms.",
  model: a.model, remoteMcpUrl: a["remote-mcp"] || "",
  outputDir: a.output || undefined, dryRun: Boolean(a["dry-run"])
});
console.log(JSON.stringify({ status:"ok", provider:"groq", run_id: result.run_id,
  model: result.model, latency_ms: result.latency_ms, remote_mcp: result.remote_mcp,
  output_dir: written.output_dir }, null, 2));
