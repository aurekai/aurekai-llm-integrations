import { buildProviderEnvelope } from "../../providers/openai/adapter.mjs";
export async function buildOpenaiRequest(input, { model, remoteMcpUrl } = {}) {
  return buildProviderEnvelope({ input, model, remoteMcpUrl });
}
