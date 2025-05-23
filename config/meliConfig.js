const axios = require("axios").default;
const setupQueue = require('../config/setupQueque'); // Importa la función que configura la cola
const credentials = require('../models/meliCredentials');

const getAccessTokenFromDB = async () => {
    const {access_token} = await credentials.findOne({}).exec();
    return access_token;
}

let queue;

const initQueue = async () => {
    if (!queue) {
        queue = await setupQueue(); // Inicializa la cola solo si no está ya inicializada
    }
};

const meliRequest = async (endpoint, method = 'GET', data = null, config = {}) => {
    await initQueue(); // Asegura que la cola esté inicializada antes de usarla
    const accessToken = await getAccessTokenFromDB();
    try {
        const response = await queue.add(() => 
            axios({
                url: `https://api.mercadolibre.com/${endpoint}`,
                method: method,
                data: data,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    ...config.headers
                },
                ...config
            })
        );
        return { success: true, data: response.data };
    } catch (error) {
        if (error.response?.data?.message === 'No winners found') {
            console.log(`Info: No winners found for ${endpoint}`);
            return { success: false, error: 'No winners found' };
        } else {
          //  console.error(`Error al hacer la solicitud a MercadoLibre con el método ${method}:`, error);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    }
};

module.exports = { meliRequest };