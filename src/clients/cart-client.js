const axios = require('axios');
const { CART_SERVICE_URL } = require('../config/serverConfig');

class CartClient {
    async clearUserCart(token) {
        return axios.delete(
            `${CART_SERVICE_URL}/api/v1/`, {
                headers: { Authorization: token }
            }
        );
    }
}

module.exports = CartClient;
