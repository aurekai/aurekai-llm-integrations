import fs from "node:fs";

const canonical = JSON.parse(fs.readFileSync("schemas/aurekai-tools.canonical.json", "utf8"));

const toOpenAI = {
  tools: canonical.tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }
  }))
};

const toAnthropic = {
  tools: canonical.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema
  }))
};

const toGemini = {
  function_declarations: canonical.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema
  }))
};

const toFunctionOnly = {
  functions: canonical.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema
  }))
};

// Cohere uses tool_name / tool_description / parameter_definitions (object map)
const toCohere = {
  tools: canonical.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameter_definitions: Object.fromEntries(
      Object.entries(tool.input_schema.properties || {}).map(([k, v]) => [
        k,
        {
          description: v.description || "",
          type: v.type || "str",
          required: (tool.input_schema.required || []).includes(k)
        }
      ])
    )
  }))
};

fs.writeFileSync("schemas/openai-tools.json", JSON.stringify(toOpenAI, null, 2) + "\n");
fs.writeFileSync("schemas/anthropic-tools.json", JSON.stringify(toAnthropic, null, 2) + "\n");
fs.writeFileSync("schemas/gemini-tools.json", JSON.stringify(toGemini, null, 2) + "\n");
fs.writeFileSync("schemas/mistral-tools.json", JSON.stringify(toFunctionOnly, null, 2) + "\n");
fs.writeFileSync("schemas/groq-tools.json", JSON.stringify(toFunctionOnly, null, 2) + "\n");
fs.writeFileSync("schemas/xai-tools.json", JSON.stringify(toFunctionOnly, null, 2) + "\n");
fs.writeFileSync("schemas/perplexity-tools.json", JSON.stringify(toFunctionOnly, null, 2) + "\n");
fs.writeFileSync("schemas/cohere-tools.json", JSON.stringify(toCohere, null, 2) + "\n");
fs.writeFileSync("schemas/local-tools.json", JSON.stringify(toFunctionOnly, null, 2) + "\n");

console.log(`Generated 9 provider schemas from canonical tool contract (${canonical.tools.length} tools).`);
