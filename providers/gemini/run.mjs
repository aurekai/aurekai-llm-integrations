import { runGeminiAdapter } from "./adapter.mjs";

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

const input = args.input || "Run a context-cached semantic retrieval comparison.";
const model = args.model || "gemini-2.5-pro";
const geminiCacheId = args["cache-id"] || `gemini-cache-${Date.now()}`;
const outputDir = args.output || "";
const dryRun = Boolean(args["dry-run"]);

try {
  const { result, written } = await runGeminiAdapter({
    input,
    model,
    geminiCacheId,
    outputDir: outputDir || undefined,
    dryRun
  });

  console.log(JSON.stringify({
    status: "ok",
    provider: "gemini",
    run_id: result.run_id,
    model: result.model,
    cache_id: result.gemini_cache_id,
    semantic_cache_key: result.semantic_cache_key,
    output_dir: written.output_dir
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
