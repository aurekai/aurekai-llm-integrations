import { buildProviderEnvelope } from "../../providers/groq/adapter.mjs";
export async function buildGroqRequest(input, { model, remoteMcpUrl } = {}) {
  return buildProviderEnvelope({ input, model, remoteMcpUrl });
}
