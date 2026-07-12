const productService = require("../shopware/product.service");
const productMapper = require("./product.mapper");
const productRepository = require("../filemaker/product.repository");
const syncLogRepository = require("../filemaker/sync-log.repository");
const syncRunService = require("./sync-run.service");

const DIRECTION = "shopware-to-filemaker-simulation";

function requireContext(context) {
  if (
    !context ||
    !context.runId ||
    !context.requestId ||
    !context.trigger
  ) {
    throw new Error("Synchronization context is required");
  }

  return context;
}

async function syncProducts(context) {
  const { runId, requestId, trigger } = requireContext(context);
  const startedAt = new Date();

  try {
    const shopwareProducts = await productService.fetchProducts();
    const fileMakerProducts = shopwareProducts.map(
      productMapper.mapShopwareProductToFileMaker
    );
    const savedCount = await productRepository.saveProducts(fileMakerProducts);
    const finishedAt = new Date();

    await syncLogRepository.createSyncLog({
      entity: "products",
      direction: DIRECTION,
      status: "success",
      savedCount,
      startedAt,
      finishedAt,
      durationMs: syncRunService.durationMs(startedAt, finishedAt),
      mode: "mock",
      runId,
      requestId,
      trigger
    });

    return {
      entity: "products",
      direction: DIRECTION,
      source: "simulated-shopware",
      target: "mongodb-backed-filemaker-simulation",
      mode: "mock",
      savedCount
    };
  } catch (error) {
    const finishedAt = new Date();

    await syncLogRepository.createSyncLog({
      entity: "products",
      direction: DIRECTION,
      status: "failure",
      savedCount: 0,
      startedAt,
      finishedAt,
      durationMs: syncRunService.durationMs(startedAt, finishedAt),
      mode: "mock",
      runId,
      requestId,
      trigger,
      details: { code: syncRunService.SAFE_FAILURE_CODE }
    }).catch(() => {});

    throw error;
  }
}

async function runProductSync({ requestId } = {}) {
  const run = await syncRunService.startRun({
    scope: "products",
    trigger: "api-products",
    requestId
  });
  const context = {
    runId: run.runId,
    requestId: run.requestId,
    trigger: run.trigger
  };

  try {
    const result = await syncProducts(context);
    const summary = {
      products: result.savedCount,
      orders: 0,
      total: result.savedCount
    };
    const completedRun = await syncRunService.completeRun(run, summary);

    return { ...completedRun, result };
  } catch (error) {
    await syncRunService.failRun(run);
    throw error;
  }
}

module.exports = { syncProducts, runProductSync };
