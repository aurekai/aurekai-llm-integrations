import { runPerplexityAdapter } from "./adapter.mjs";
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
const { result, written } = await runPerplexityAdapter({
  input: a.input || "Find and summarize the Aurekai integration ecosystem.",
  model: a.model, searchContextSize: a["search-context"] || "high",
  outputDir: a.output || undefined, dryRun: Boolean(a["dry-run"])
});
console.log(JSON.stringify({ status:"ok", provider:"perplexity", run_id: result.run_id,
  model: result.model, citation_count: result.citations.length,
  output_dir: written.output_dir }, null, 2));
