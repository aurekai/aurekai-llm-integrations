import { buildProviderEnvelope } from "../../providers/perplexity/adapter.mjs";
export async function buildPerplexityRequest(input, { model, searchContextSize } = {}) {
  return buildProviderEnvelope({ input, model, searchContextSize });
}
