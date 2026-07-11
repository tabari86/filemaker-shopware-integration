const packageJson = require("../../package.json");
function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`Missing required environment variable: ${name}`);
  return value.trim();
}

function parsePort() {
  if (process.env.PORT === undefined || process.env.PORT === "") return 3000;

  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535");
  }

  return port;
}

function validateRuntimeConfig() {
  required("MONGODB_URI");
  required("MONGODB_DB_NAME");
  if (required("API_KEY").length < 32) throw new Error("API_KEY must be at least 32 characters long");
  parsePort();
}

module.exports = {
  serviceName: packageJson.name,
  version: packageJson.version,
  nodeEnv: process.env.NODE_ENV || "development",
  get port() { return parsePort(); },
  get mongodbUri() { return process.env.MONGODB_URI; },
  get mongodbDbName() { return process.env.MONGODB_DB_NAME; },
  get apiKey() { return process.env.API_KEY || ""; },
  validateRuntimeConfig
};
