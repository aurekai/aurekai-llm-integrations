import { buildProviderEnvelope } from "../../providers/local/adapter.mjs";
export async function buildLocalRequest(input, { model, baseUrl } = {}) {
  return buildProviderEnvelope({ input, model, baseUrl });
}
