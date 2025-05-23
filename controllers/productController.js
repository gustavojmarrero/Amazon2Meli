const { readSheet, updateSheet, clearSheet } = require('../config/googleSheetsConfig');
const AsinCatalogMapping = require("../models/asinCatalogMapping");

const SPREADSHEET_ID = '1PKFCSNVsRR8wM6mOeckoJUYGqKrZ9oWrbvSf_7FHLD8';  // Centraliza la ID de la hoja de cálculo

// Función principal para obtener la información del producto
const fetchProductInfo = async (req, res) => {
  try {
    // Realizar las llamadas a las distintas funciones en paralelo
    const [mlms, productsData, inventoryData, sales30DaysData] = await Promise.all([
      getMlm(),
      getProductsData(),
      getInventoryData(),
      getSales30DaysData() // Obtener datos de ventas de los últimos 30 días
    ]);

    // Función para verificar si todos los valores de un array son null, undefined o están vacíos
    const isAllNullOrEmpty = (arr) => {
      return arr.every(item => item === null || item === undefined || item === '');
    };

    // Mapear los datos de cada producto y eliminar filas vacías
    const dataToUpload = mlms.flatMap(mlm => {
      const product = productsData.find(p => p.mlm === mlm) || {};
      const inventory = inventoryData.find(i => i.mlm === mlm) || {};
      const sales = sales30DaysData.find(s => s.sku === product.sku) || {};

      const productData = [
        product.sku || '',
        product.asin || '',
        mlm,  // MLM
        product.img || '',
        product.image || '',
        product.title || ''
      ];

      const inventoryDataArray = [
        inventory.sku || '',
        inventory.asin || '',
        inventory.mlm || '',  // MLM
        inventory.stock || 0,
        inventory.request || 0
      ];

      const salesData = [
        product.sku || '',
        sales.qty || 0,  // Ventas de los últimos 30 días
        sales.conversion || 0  // Conversión de ventas de los últimos 30 días
      ];

      // Solo incluir datos que no están completamente vacíos
      const hasProductData = !isAllNullOrEmpty(productData);
      const hasInventoryData = !isAllNullOrEmpty(inventoryDataArray);
      const hasSalesData = !isAllNullOrEmpty(salesData);

      // Filtrar filas de inventario donde stock y request son ambos 0
      const isInventoryEmpty = inventory.stock === 0 && inventory.request === 0;

      if ((hasProductData || hasSalesData) || (hasInventoryData && !isInventoryEmpty)) {
        return {
          productData: hasProductData ? productData : null,
          inventoryData: hasInventoryData && !isInventoryEmpty ? inventoryDataArray : null,
          salesData: hasSalesData ? salesData : null
        };
      }
      return [];
    });

    // Filtrar y preparar los datos para cada hoja
    const dataProductsUpload = dataToUpload
      .map(item => item.productData)
      .filter(data => data !== null);

    const dataInventoryUpload = dataToUpload
      .map(item => item.inventoryData)
      .filter(data => data !== null && !(data[3] === 0 && data[4] === 0)); // Filtrar arrays con stock y request en 0

    const dataSalesUpload = dataToUpload
      .map(item => item.salesData)
      .filter(data => data !== null);

    // Obtener datos adicionales de AsinCatalogMapping
    const dataAsinCatalogMappingUpload = await getAsinCatalogMappingData(dataProductsUpload);

    // Actualizar las distintas hojas en paralelo
    await Promise.all([
      setProductos(dataProductsUpload),
      setInventario(dataInventoryUpload),
      setAsinCatalogMapping(dataAsinCatalogMappingUpload),
      setSales30Days(dataSalesUpload) // Subir datos de ventas de los últimos 30 días
    ]);

    // Respuesta exitosa
    return res.status(200).json({
      status: 'success',
      productos: dataProductsUpload,
      inventario: dataInventoryUpload,
      asinCatalogMapping: dataAsinCatalogMappingUpload,
      sales: dataSalesUpload
    });

  } catch (error) {
    console.error('Error fetching product information:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product information.'
    });
  }
};

// Obtener los MLM desde la hoja "Lista"
const getMlm = async () => {
  const range = 'Lista!A2:A'; 
  const mlmValues = await readSheet(SPREADSHEET_ID, range);
  return mlmValues.map(mlm => mlm[0]);
};

// Obtener datos de productos
const getProductsData = async () => {
  const spreadsheetId = '1QTWoQrOCjP7BfuFG3yKnGzQsueGvKaLQr19Fs2AqZqk';
  const range = 'Productos!A2:F'; 
  const productsValues = await readSheet(spreadsheetId, range);
  return productsValues.map(product => ({
    sku: product[0],
    asin: product[1],
    mlm: product[2],
    img: product[3],
    image: product[4],
    title: product[5]
  }));
};

// Obtener datos de inventario
const getInventoryData = async () => {
  const spreadsheetId = '1PqVF0H0pf8VM-n9yVcar-Dn9rGzysWHSb12UyERGrSM';
  const range = 'Inventario!B2:P'; 
  const inventoryValues = await readSheet(spreadsheetId, range);
  return inventoryValues.map(inventory => ({
    sku: inventory[0],
    asin: inventory[1],
    mlm: inventory[2],
    stock: inventory[8],
    request: inventory[14]
  }));
};

// Obtener datos de AsinCatalogMapping
const getAsinCatalogMappingData = async (dataProductsUpload) => {
  const asins = dataProductsUpload.map(product => product[1]);  // Extraer los ASINs
  
  // Agregar log para ver qué ASINs se están consultando
  console.log("ASINs a buscar:", asins);
  
  const response = await AsinCatalogMapping.find({ asin: { $in: asins } })
    .select('asin mlCatalogId amazonPrice firstListingPrice averagePriceLast30Days totalVisitsLast30Days estimatedProfit priceHistory sellerId soldQuantity mlSaleCommission mlShippingCost keepaAmazonAvgPrice90Days keepaAmazonOutOfStock90Days')
    .lean();
  
  // Agregar log para verificar documentos retornados
  console.log("Documentos encontrados:", response.length);
  if (response.length > 0) {
    console.log("Ejemplo de documento:", JSON.stringify({
      asin: response[0].asin,
      sellerId: response[0].sellerId
    }));
  }
  
  return response.map(item => {
    // Calcular el precio mínimo
    let minimumPrice = '';
    // Asegurarse que amazonPrice existe, es > 0, mlSaleCommission existe y es < 1
    if (item.amazonPrice && item.amazonPrice > 0 && typeof item.mlSaleCommission === 'number' && item.mlSaleCommission < 1) {
      // Usar 0 si mlShippingCost es null o undefined
      const shippingCost = item.mlShippingCost || 0;
      minimumPrice = (item.amazonPrice + shippingCost + 70) / (1 - item.mlSaleCommission);
    }

    return [
      item.asin,
      item.mlCatalogId,
      item.amazonPrice,
      item.firstListingPrice,
      item.averagePriceLast30Days,
      item.totalVisitsLast30Days,
      item.estimatedProfit,
      item.priceHistory.length,
      item.sellerId || '',
      item.soldQuantity || '',
      minimumPrice, // Agregar el precio mínimo calculado
      item.keepaAmazonAvgPrice90Days || '',
      item.keepaAmazonOutOfStock90Days !== undefined && item.keepaAmazonOutOfStock90Days !== null ? item.keepaAmazonOutOfStock90Days : ''
    ];
  });
};

// Obtener datos de ventas de los últimos 30 días
const getSales30DaysData = async () => {
  const spreadsheetId = '1f31R_Qd-h1Cvelgt0A98tGmb6x56UJK6qKIaX2Qxj1E';
  const range = 'Ventas30!A2:M';
  const sales30DaysValues = await readSheet(spreadsheetId, range);
  return sales30DaysValues.map(sale => ({
    sku: sale[0],
    qty: sale[2],
    conversion: sale[12]  // Corregido 'convertion' a 'conversion'
  }));
};

// Actualizar datos de productos
const setProductos = async (dataToUpload) => {
  const range = 'Productos!A2:F'; 
  await clearSheet(SPREADSHEET_ID, range);
  await updateSheet(SPREADSHEET_ID, range, dataToUpload);
};

// Actualizar datos de inventario
const setInventario = async (dataToUpload) => {
  const range = 'Inventario!A2:E'; 
  await clearSheet(SPREADSHEET_ID, range);
  await updateSheet(SPREADSHEET_ID, range, dataToUpload);
};

// Actualizar datos de AsinCatalogMapping
const setAsinCatalogMapping = async (dataAsinCatalogMappingUpload) => {
  const range = 'asincatalogmappings!A2:M'; // Actualizar el rango a M para incluir las nuevas columnas
  await clearSheet(SPREADSHEET_ID, range);
  await updateSheet(SPREADSHEET_ID, range, dataAsinCatalogMappingUpload);
};

// Actualizar datos de ventas de los últimos 30 días
const setSales30Days = async (dataToUpload) => {
  const range = 'Ventas30!A2:C'; 
  await clearSheet(SPREADSHEET_ID, range);
  await updateSheet(SPREADSHEET_ID, range, dataToUpload);
};

module.exports = {
  fetchProductInfo
};