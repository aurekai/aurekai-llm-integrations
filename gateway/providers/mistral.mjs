import { buildProviderEnvelope } from "../../providers/mistral/adapter.mjs";
export async function buildMistralRequest(input, { model, mcpUrl } = {}) {
  return buildProviderEnvelope({ input, model, mcpUrl });
}
