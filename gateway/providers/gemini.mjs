import { buildProviderEnvelope } from "../../providers/gemini/adapter.mjs";
export async function buildGeminiRequest(input, { model, geminiCacheId } = {}) {
  return buildProviderEnvelope({ input, model, geminiCacheId });
}
