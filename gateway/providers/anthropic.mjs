import { buildProviderEnvelope } from "../../providers/anthropic/adapter.mjs";
export async function buildAnthropicRequest(input, { model, mcpConfig } = {}) {
  return buildProviderEnvelope({ input, model, mcpConfig });
}
