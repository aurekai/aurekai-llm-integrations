export const providerName = "gemini";

export function buildProviderEnvelope(tools) {
  return {
    provider: providerName,
    tools,
    proofOutputs: [".akrun.json", ".akproof.json", ".aktrace.jsonl", ".akfeatures.json", ".akcost.json"]
  };
}
