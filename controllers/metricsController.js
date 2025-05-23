const moment = require('moment');
const { meliRequest } = require("../config/meliConfig");
const {
  readSheet,
  updateSheet,
  clearSheet,
} = require("../config/googleSheetsConfig");

require("dotenv").config();


const getOrdersByPeriod = async (startDate, endDate) => {
  try {
      const dateFormat = 'DD/MM/YYYY'
      const formattedStartDate = moment(startDate, dateFormat).startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSSZ');
      const formattedEndDate = moment(endDate, dateFormat).endOf('day').format('YYYY-MM-DDTHH:mm:ss.SSSZ');
      console.log("Obteniendo órdenes entre", formattedStartDate, "y", formattedEndDate)
      
      let allOrders = [];
      let offset = 0;
      const limit = 50;
      let data;
  
      do {
          const response = await meliRequest("orders/search", "GET", null, {
              params: {
                  seller: "397528431",
                  "order.status": "paid",
                  "order.date_created.from": formattedStartDate,
                  "order.date_created.to": formattedEndDate,
                  offset: offset,
                  limit: limit,
              },
          });
          if (!response.success) {
              throw new Error(`API returned an error: ${response.error}`);
          }

          data = response.data;

          if (!data || !data.results) {
              throw new Error("API response did not contain 'results'");
          }

          allOrders = allOrders.concat(data.results);
          offset += data.results.length;
      } while (data.results.length === limit);

      const formattedData = allOrders.map(order => {
          return [
              moment(order.date_created).format('DD/MM/YYYY'),
              `'${order.id}`,
              order.order_items[0].item.id,
              order.order_items[0].item.seller_sku,
              order.order_items[0].item.title,
              order.order_items[0].quantity,
              order.order_items[0].unit_price,
              order.total_amount,
              order.shipping_cost,
              order.order_items[0].sale_fee,
          ];
      });

      return formattedData;
  } catch (error) {
      console.error(`Error al obtener las órdenes entre ${startDate} y ${endDate}:`, error);
      throw error;
  }
}

const getVisitsLast30Days = async () => {
  try {
    const itemIds = await getVisitsIds();
    const visitsData = [];

    for (const itemId of itemIds) {
      const response = await meliRequest(`/items/${itemId}/visits/time_window?last=30&unit=day`);

      if (!response.success) {
        console.error(`API returned an error for itemId ${itemId}: ${response.error}`);
        continue; // Continúa con el siguiente itemId si hay un error
      }

      const totalVisits = response.data.total_visits || 0;
      console.log(`Total visits for itemId ${itemId}: ${totalVisits}`);
      visitsData.push([itemId, totalVisits]);
    }

    return visitsData;
  } catch (error) {
    console.error('Error fetching visits:', error);
    throw error;
  }
};
const setOrdersLast180Days = async () => {
    try {

        const startDate = moment().subtract(180, 'days').format('DD/MM/YYYY');
        const endDate = moment().format('DD/MM/YYYY');
        const formattedData = await getOrdersByPeriod(startDate, endDate);
      // Limpia la hoja de calculo
      await clearSheet('1f31R_Qd-h1Cvelgt0A98tGmb6x56UJK6qKIaX2Qxj1E', 'Ordenes180!A2:J');
      await updateSheet('1f31R_Qd-h1Cvelgt0A98tGmb6x56UJK6qKIaX2Qxj1E', `Ordenes180!A2:J`, formattedData);
      return console.log("Datos actualizados en la hoja de cálculo");
    } catch (error) {
        console.error('Error al obtener las órdenes de los últimos 180 días:', error);
        throw error;
    }
}

const setVisitsLast30Days = async () => {
  try {
    const spreadsheetId = '1f31R_Qd-h1Cvelgt0A98tGmb6x56UJK6qKIaX2Qxj1E';
    const range = 'VisitasMLM!C2:C';  // Columna C donde se insertarán las visitas
    const visitsData = await getVisitsLast30Days();
    await clearSheet('1f31R_Qd-h1Cvelgt0A98tGmb6x56UJK6qKIaX2Qxj1E', 'VisitasMLM!C2:C');
    // Insertar los valores en la hoja de cálculo
    await updateSheet(spreadsheetId, range, visitsData.map(([_, totalVisits]) => [totalVisits]));
    
    console.log("Datos de visitas actualizados en la hoja de cálculo");
  } catch (error) {
    console.error('Error updating visits data:', error);
    throw error;
  }
};
const fetchAndSaveSalesAndVisitsData = async (req, res) => {
  try {
    await setOrdersLast180Days();
    
    await delay(3000);

    await setVisitsLast30Days();

    return res.status(200).json({
      status: 'success',
      message: 'Orders and visits from the last 180 days fetched successfully.'
    });
  } catch (error) {
    console.error('Error fetching orders and visits from the last 180 days:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch orders and visits from the last 180 days.'
    });
  }
};

const getVisitsIds= async () => {
    const range = 'VisitasMLM!A2:A'; 
    const data = await readSheet('1f31R_Qd-h1Cvelgt0A98tGmb6x56UJK6qKIaX2Qxj1E', range);
    return data.flat();
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))


module.exports = {
  fetchAndSaveSalesAndVisitsData,
};