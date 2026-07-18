// Generates existing_mcp_servers.json (gitignored) from the committed
// template by substituting ${VAR_NAME} placeholders with values from .env.
// Run: npm run setup:mcp
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '..', 'existing_mcp_servers.template.json');
const outputPath = path.join(__dirname, '..', 'existing_mcp_servers.json');

let contents = fs.readFileSync(templatePath, 'utf8');

contents = contents.replace(/\$\{(\w+)\}/g, (match, varName) => {
  const value = process.env[varName];
  if (!value) {
    throw new Error(`Missing ${varName} in .env (required by existing_mcp_servers.template.json)`);
  }
  return value;
});

fs.writeFileSync(outputPath, contents);
console.log(`Wrote ${outputPath}`);
