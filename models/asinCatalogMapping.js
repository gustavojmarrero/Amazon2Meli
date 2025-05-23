const db = require("../config/mongoDbConfig");
const { Schema } = require("mongoose");

const asinCatalogSchema = new Schema(
  {
    asin: { type: String, unique: true },
    amazonPrice: { type: Number, default: 0 },
    amazonPriceUpdatedAt: { type: Date, default: null },
    gtin: { type: String, default: null },
    mlCatalogId: { type: String, default: null },
    mlCategoryId: { type: String, default: null },
    itemIds: [{ type: String, default: [] }],
    identifiers: [{ type: String, default: null }],  // Array de identificadores (GTIN, EAN, UPC)
    image: { type: String, default: null },
    catalogIdentifier: { type: String, default: null },  // Identificador que coincide con el catálogo en MercadoLibre
    averagePriceLast30Days: { type: Number, default: 0 },
    averagePriceLast90Days: { type: Number, default: 0 },
    averagePriceLast180Days: { type: Number, default: 0 },
    priceHistory: [
      {
        price: Number,
        date: { type: Date, default: Date.now },
      },
    ],
    title: { type: String, default: null },
    firstListingPrice: { type: Number, default: 0 },
    firstListingPriceUpdatedAt: { type: Date, default: null },  
    totalVisitsLast30Days: { type: Number, default: 0 },
    totalVisitsLast30DaysUpdatedAt: { type: Date, default: null },  
    mlCatalogIdUpdatedAt: { type: Date, default: null },  
    mlSaleCommission: { type: Number, default: 0 },
    mlShippingCost: { type: Number, default: 0 },
    mlShippingCostsUpdatedAt: { type: Date, default: null },  
    estimatedProfit: { type: Number, default: 0 },
    sellerId: { type: String, default: null },
    soldQuantity: { type: Number, default: 0 },
    keepaAmazonAvgPrice90Days: { type: Number, default: 0 },
    keepaAmazonOutOfStock90Days: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const AsinCatalogMapping = db.model("AsinCatalogMapping", asinCatalogSchema);

module.exports = AsinCatalogMapping;