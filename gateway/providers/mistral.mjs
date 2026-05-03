export function buildMistralRequest(input) {
  return {
    provider: "mistral",
    input,
    toolNamespace: "aurekai"
  };
}
