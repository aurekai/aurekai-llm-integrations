export const providerName = "anthropic";

export function buildProviderEnvelope(tools) {
  return {
    provider: providerName,
    tools,
    proofOutputs: [".akrun.json", ".akproof.json", ".aktrace.jsonl", ".akfeatures.json", ".akcost.json"]
  };
}
