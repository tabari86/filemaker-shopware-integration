const config = require("../config/env");

async function getAccessToken() {
  if (config.useMockData) {
    return {
      accessToken: "mock-access-token",
      expiresIn: 3600,
      mode: "mock"
    };
  }

  return {
    accessToken: null,
    expiresIn: 0,
    mode: "real"
  };
}

module.exports = {
  getAccessToken
};