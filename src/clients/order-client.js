const axios = require('axios');
const { ORDER_SERVICE_URL } = require('../config/serverConfig');

class OrderClient {
    async getOrder(orderId) {
        const response = await axios.get(
            `${ORDER_SERVICE_URL}/api/v1/orders/${orderId}`
        );

        return response.data.data;
    }

    async updateOrder(orderId, payload) {
        return axios.patch(
            `${ORDER_SERVICE_URL}/api/v1/orders/${orderId}`,
            payload
        );
    }
}

module.exports = OrderClient;
