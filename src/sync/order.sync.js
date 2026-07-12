const orderService = require("../shopware/order.service");
const orderMapper = require("./order.mapper");
const orderRepository = require("../filemaker/order.repository");
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

async function syncOrders(context) {
  const { runId, requestId, trigger } = requireContext(context);
  const startedAt = new Date();

  try {
    const shopwareOrders = await orderService.fetchOrders();
    const fileMakerOrders = shopwareOrders.map(
      orderMapper.mapShopwareOrderToFileMaker
    );
    const savedCount = await orderRepository.saveOrders(fileMakerOrders);
    const finishedAt = new Date();

    await syncLogRepository.createSyncLog({
      entity: "orders",
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
      entity: "orders",
      direction: DIRECTION,
      source: "simulated-shopware",
      target: "mongodb-backed-filemaker-simulation",
      mode: "mock",
      savedCount
    };
  } catch (error) {
    const finishedAt = new Date();

    await syncLogRepository.createSyncLog({
      entity: "orders",
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

async function runOrderSync({ requestId } = {}) {
  const run = await syncRunService.startRun({
    scope: "orders",
    trigger: "api-orders",
    requestId
  });
  const context = {
    runId: run.runId,
    requestId: run.requestId,
    trigger: run.trigger
  };

  try {
    const result = await syncOrders(context);
    const summary = {
      products: 0,
      orders: result.savedCount,
      total: result.savedCount
    };
    const completedRun = await syncRunService.completeRun(run, summary);

    return { ...completedRun, result };
  } catch (error) {
    await syncRunService.failRun(run);
    throw error;
  }
}

module.exports = { syncOrders, runOrderSync };
