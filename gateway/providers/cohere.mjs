export function buildCohereRequest(input) {
  return {
    provider: "cohere",
    input,
    toolNamespace: "aurekai"
  };
}
