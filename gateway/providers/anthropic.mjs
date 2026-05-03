export function buildAnthropicRequest(input) {
  return {
    provider: "anthropic",
    input,
    toolNamespace: "aurekai"
  };
}
