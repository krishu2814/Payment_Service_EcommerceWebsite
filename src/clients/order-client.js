const axios = require("axios");
const { ORDER_SERVICE_URL } = require("../config/serverConfig");

class OrderClient {
  async getOrder(orderId, authorization) {
    try {
      const config = {};

      if (authorization) {
        config.headers = {
          Authorization: authorization,
        };
      }

      const response = await axios.get(
        `${ORDER_SERVICE_URL}/api/v1/${orderId}`,
        config,
      );

      return response.data.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error("Order Service authentication failed");
      }

      if (error.response?.status === 403) {
        throw new Error("Order Service rejected the token");
      }

      if (error.response?.status === 404) {
        throw new Error("Order not found");
      }

      throw new Error("Order Service is unavailable");
    }
  }
}

module.exports = OrderClient;
