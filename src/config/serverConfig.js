require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5013,
  MONGO_URL: process.env.MONGO_URL,
  ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL,
  SECRET_TOKEN: process.env.SECRET_TOKEN || "ecommerce_jwt_secret_dev_key",
  CART_SERVICE_URL: process.env.CART_SERVICE_URL,
  RABBITMQ_URL: process.env.RABBITMQ_URL,
  EXCHANGE_NAME: process.env.EXCHANGE_NAME || "ecommerce_events",
};
