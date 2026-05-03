import { buildProviderEnvelope } from "../../providers/cohere/adapter.mjs";
export async function buildCohereRequest(query, { model, documents } = {}) {
  return buildProviderEnvelope({ query, model, documents });
}
