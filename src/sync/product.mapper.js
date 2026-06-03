function mapShopwareProductToFileMaker(product) {
  return {
    shopwareId: product.id,
    productNumber: product.productNumber,
    productName: product.name,
    stockQuantity: product.stock,
    isActive: product.active,
    netPrice: product.price?.net || 0,
    grossPrice: product.price?.gross || 0,
    syncedAt: new Date().toISOString()
  };
}

module.exports = {
  mapShopwareProductToFileMaker
};