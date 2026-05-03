export function buildGeminiRequest(input) {
  return {
    provider: "gemini",
    input,
    toolNamespace: "aurekai"
  };
}
