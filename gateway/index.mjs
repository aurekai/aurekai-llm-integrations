import fs from "node:fs";
import path from "node:path";

const registryPath = path.resolve("gateway/capability-registry.json");
const canonicalPath = path.resolve("schemas/aurekai-tools.canonical.json");

const capabilities = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));

function chooseProvider(requirements) {
  const providers = Object.entries(capabilities);
  for (const [name, caps] of providers) {
    const ok = requirements.every((key) => Boolean(caps[key]));
    if (ok) return name;
  }
  return "openai";
}

const provider = chooseProvider(["function_calling", "batch"]);
console.log("Aurekai gateway demo route:", provider);
console.log("Available canonical tools:", canonical.tools.length);
console.log("Proof outputs: .akrun.json .akproof.json .aktrace.jsonl .akfeatures.json .akcost.json");
