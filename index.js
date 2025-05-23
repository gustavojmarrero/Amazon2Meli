const express = require('express');
const app = express();

// Importar las rutas de productos
const productRoutes = require('./routes/productRoutes');
const metricsRoutes = require('./routes/metricsRoutes');

// Usar las rutas
app.use(productRoutes);
app.use(metricsRoutes);

// No inicies el servidor localmente
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

// Exportar la aplicación para que Google Cloud Functions la maneje
exports.amazon2meli = app;


