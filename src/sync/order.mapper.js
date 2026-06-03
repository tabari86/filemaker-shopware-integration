function mapShopwareOrderToFileMaker(order) {
  return {
    shopwareId: order.id,
    orderNumber: order.orderNumber,
    orderDate: order.orderDate,
    amountTotal: order.amountTotal,
    amountNet: order.amountNet,
    status: order.status,
    customerId: order.customer?.id || null,
    customerName: `${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim(),
    customerEmail: order.customer?.email || null,
    lineItems: order.lineItems.map((item) => ({
      lineItemId: item.id,
      productNumber: item.productNumber,
      productName: item.label,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice
    })),
    syncedAt: new Date().toISOString()
  };
}

module.exports = {
  mapShopwareOrderToFileMaker
};