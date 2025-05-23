const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController'); // Asegúrate de que la ruta es correcta

// Añadir la ruta para fetchProductInfo
router.get('/api/product/fetch-info', productController.fetchProductInfo);

module.exports = router;