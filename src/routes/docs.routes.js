const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiDocument = require("../../docs/openapi.json");

const router = express.Router();
const uiOptions = {
  customSiteTitle: "FileMaker-Shopware Integration API",
  customCss: "",
  swaggerOptions: { persistAuthorization: false }
};
const uiHtml = swaggerUi
  .generateHTML(openapiDocument, uiOptions)
  .replace("<head>", '<head>\n  <base href="/api-docs/">');

router.get("/api-docs.json", (req, res) => {
  res.status(200).json(openapiDocument);
});

router.get(["/api-docs", "/api-docs/"], (req, res) => {
  res.status(200).type("html").send(uiHtml);
});

router.use(
  "/api-docs",
  ...swaggerUi.serveFiles(openapiDocument, uiOptions)
);

module.exports = router;
