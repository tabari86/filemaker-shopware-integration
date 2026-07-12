const productSync = require("./product.sync");
const orderSync = require("./order.sync");
const syncLogRepository = require("../filemaker/sync-log.repository");
const syncRunService = require("./sync-run.service");

const DIRECTION = "shopware-to-filemaker-simulation";

async function runDashboardSync({ requestId } = {}) {
  const run = await syncRunService.startRun({
    scope: "all",
    trigger: "api-all",
    requestId
  });
  const context = {
    runId: run.runId,
    requestId: run.requestId,
    trigger: run.trigger
  };
  const startedAt = new Date();
  let dashboardSuccessLogged = false;

  try {
    const productResult = await productSync.syncProducts(context);
    const orderResult = await orderSync.syncOrders(context);
    const finishedAt = new Date();
    const summary = {
      products: productResult.savedCount,
      orders: orderResult.savedCount,
      total: productResult.savedCount + orderResult.savedCount
    };

    await syncLogRepository.createSyncLog({
      entity: "dashboard",
      direction: DIRECTION,
      status: "success",
      savedCount: summary.total,
      startedAt,
      finishedAt,
      durationMs: syncRunService.durationMs(startedAt, finishedAt),
      mode: "mock",
      runId: context.runId,
      requestId: context.requestId,
      trigger: context.trigger,
      details: summary
    });
    dashboardSuccessLogged = true;
    const completedRun = await syncRunService.completeRun(run, summary);

    return {
      ...completedRun,
      mode: "mock",
      results: {
        products: productResult,
        orders: orderResult
      }
    };
  } catch (error) {
    const finishedAt = new Date();

    if (!dashboardSuccessLogged) {
      await syncLogRepository.createSyncLog({
        entity: "dashboard",
        direction: DIRECTION,
        status: "failure",
        savedCount: 0,
        startedAt,
        finishedAt,
        durationMs: syncRunService.durationMs(startedAt, finishedAt),
        mode: "mock",
        runId: context.runId,
        requestId: context.requestId,
        trigger: context.trigger,
        details: { code: syncRunService.SAFE_FAILURE_CODE }
      }).catch(() => {});
    }

    await syncRunService.failRun(run);
    throw error;
  }
}

module.exports = {
  runDashboardSync
};
