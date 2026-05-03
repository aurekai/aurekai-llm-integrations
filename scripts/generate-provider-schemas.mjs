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

fs.writeFileSync("schemas/openai-tools.json", JSON.stringify(toOpenAI, null, 2) + "\n");
fs.writeFileSync("schemas/anthropic-tools.json", JSON.stringify(toAnthropic, null, 2) + "\n");
fs.writeFileSync("schemas/gemini-tools.json", JSON.stringify(toGemini, null, 2) + "\n");
fs.writeFileSync("schemas/mistral-tools.json", JSON.stringify(toFunctionOnly, null, 2) + "\n");
fs.writeFileSync("schemas/groq-tools.json", JSON.stringify(toFunctionOnly, null, 2) + "\n");
fs.writeFileSync("schemas/xai-tools.json", JSON.stringify(toFunctionOnly, null, 2) + "\n");

console.log("Generated provider schemas from canonical tool contract.");
