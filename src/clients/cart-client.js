const axios = require('axios');
const { CART_SERVICE_URL } = require('../config/serverConfig');

class CartClient {
    async clearUserCart(userId) {
        return axios.delete(
            `${CART_SERVICE_URL}/api/v1/cart/delete/${userId}`
        );
    }
}

module.exports = CartClient;
