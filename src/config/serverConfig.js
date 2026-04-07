require('dotenv').config();

module.exports = {
    PORT: process.env.PORT,
    MONGO_URL: process.env.MONGO_URL,
    ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL,
    JWT_SECRET: process.env.JWT_SECRET
}
