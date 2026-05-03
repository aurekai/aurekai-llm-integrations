export function buildLocalRequest(input) {
  return {
    provider: "local",
    input,
    toolNamespace: "aurekai"
  };
}
