import { buildProviderEnvelope } from "../../providers/xai/adapter.mjs";
export async function buildXaiRequest(input, { model } = {}) {
  return buildProviderEnvelope({ input, model });
}
