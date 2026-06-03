const config = {
  port: process.env.PORT || 3000,
  useMockData: process.env.USE_MOCK_DATA !== "false",

  shopware: {
    baseUrl: process.env.SHOPWARE_BASE_URL || "",
    clientId: process.env.SHOPWARE_CLIENT_ID || "",
    clientSecret: process.env.SHOPWARE_CLIENT_SECRET || "",
    accessKey: process.env.SHOPWARE_ACCESS_KEY || ""
  }
};

module.exports = config;