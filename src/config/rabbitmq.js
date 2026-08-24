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

const crypto = require("crypto");

const publishEvent = async (routingKey, message, options = {}) => {
  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }

  try {
    const correlationId =
      options.correlationId ||
      message.correlationId ||
      `amqp_${crypto.randomUUID()}`;

    message.correlationId = correlationId;

    channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: "application/json",
        correlationId,
        headers: {
          "x-correlation-id": correlationId,
          ...(options.headers || {}),
        },
      },
    );

    console.log(`[${correlationId}] [Payment-Service] Event published: ${routingKey}`);
  } catch (error) {
    console.error(`Failed to publish event ${routingKey}:`, error);
    throw error;
  }
};

module.exports = {
  connectRabbitMQ,
  publishEvent,
};
