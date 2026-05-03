import fs from "node:fs";

const matrix = JSON.parse(fs.readFileSync("evals/matrix.json", "utf8"));

console.log("Aurekai eval matrix providers:", matrix.providers.join(", "));
console.log("Aurekai eval matrix metrics:", matrix.metrics.join(", "));
console.log("Outputs will include .akrun.json, .akproof.json, .aktrace.jsonl, .akfeatures.json, .akcost.json");
