require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5013,
  MONGO_URL: process.env.MONGO_URL,
  ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL,
  SECRET_TOKEN: process.env.SECRET_TOKEN || "ecommerce_jwt_secret_dev_key",
  CART_SERVICE_URL: process.env.CART_SERVICE_URL,
  RABBITMQ_URL: process.env.RABBITMQ_URL,
  EXCHANGE_NAME: process.env.EXCHANGE_NAME || "ecommerce_events",

  // Stripe Configuration
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",

  // Razorpay Configuration
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "",

  // Default Currency (USD or INR)
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || "USD",
};

