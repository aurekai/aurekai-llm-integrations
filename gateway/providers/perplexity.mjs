export function buildPerplexityRequest(input) {
  return {
    provider: "perplexity",
    input,
    toolNamespace: "aurekai"
  };
}
