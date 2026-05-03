export function buildOpenaiRequest(input) {
  return {
    provider: "openai",
    input,
    toolNamespace: "aurekai"
  };
}
