import { runXaiAdapter } from "./adapter.mjs";
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
const { result, written } = await runXaiAdapter({
  input: a.input || "Run Grok research and export Aurekai proof bundle.",
  model: a.model, outputDir: a.output || undefined, dryRun: Boolean(a["dry-run"])
});
console.log(JSON.stringify({ status:"ok", provider:"xai", run_id: result.run_id,
  model: result.model, output_dir: written.output_dir }, null, 2));
