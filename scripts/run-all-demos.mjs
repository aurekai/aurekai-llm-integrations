import { spawnSync } from "node:child_process";

const providers = [
  "openai", "anthropic", "gemini",
  "groq", "perplexity", "mistral", "xai", "cohere", "local"
];

let passed = 0;
let failed = 0;

for (const p of providers) {
  const runner = `providers/${p}/run.mjs`;
  const result = spawnSync("node", [runner, "--dry-run"], {
    cwd: new URL("../", import.meta.url).pathname,
    encoding: "utf8",
    timeout: 10000
  });
  if (result.status === 0) {
    const out = JSON.parse(result.stdout.trim());
    console.log(`  ✓  ${p.padEnd(12)} run_id=${out.run_id}`);
    passed++;
  } else {
    console.error(`  ✗  ${p.padEnd(12)} ${result.stderr?.trim() || "error"}`);
    failed++;
  }
}

console.log(`\nAll demos: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
