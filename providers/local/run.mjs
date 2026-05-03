import { runLocalAdapter } from "./adapter.mjs";
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
const { result, written } = await runLocalAdapter({
  input: a.input || "Run Aurekai doctor check via local Llama runtime.",
  model: a.model || "llama3.3",
  baseUrl: a["base-url"] || "http://localhost:11434",
  outputDir: a.output || undefined, dryRun: Boolean(a["dry-run"])
});
console.log(JSON.stringify({ status:"ok", provider:"local", run_id: result.run_id,
  model: result.model, base_url: result.base_url, output_dir: written.output_dir }, null, 2));
