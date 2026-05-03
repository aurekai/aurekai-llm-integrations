export function buildXaiRequest(input) {
  return {
    provider: "xai",
    input,
    toolNamespace: "aurekai"
  };
}
