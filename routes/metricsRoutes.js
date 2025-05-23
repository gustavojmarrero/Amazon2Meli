const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController'); // Asegúrate de que la ruta es correcta

// Añadir la ruta para fetchProductInfo
router.get('/api/metrics/', metricsController.fetchAndSaveSalesAndVisitsData);

module.exports = router;