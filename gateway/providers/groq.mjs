export function buildGroqRequest(input) {
  return {
    provider: "groq",
    input,
    toolNamespace: "aurekai"
  };
}
