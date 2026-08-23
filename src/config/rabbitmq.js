const amqp = require("amqplib");
const { RABBITMQ_URL, EXCHANGE_NAME } = require("./serverConfig");

let channel;

const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);

    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", {
      durable: true,
    });

    console.log("Connected to RabbitMQ");
  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error);
    throw error;
  }
};

const publishEvent = async (routingKey, message) => {
  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }

  try {
    channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: "application/json",
      },
    );

    console.log(`Event published: ${routingKey}`);
  } catch (error) {
    console.error(`Failed to publish event ${routingKey}:`, error);
    throw error;
  }
};

module.exports = {
  connectRabbitMQ,
  publishEvent,
};
