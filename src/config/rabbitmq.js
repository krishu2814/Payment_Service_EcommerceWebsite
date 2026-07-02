const amqp = require('amqplib');
const { RABBITMQ_URL } = require('./serverConfig');

let channel;

const connectRabbitMQ = async () => {
    try {
        // 1. Connect to RabbitMQ server
        const connection = await amqp.connect(RABBITMQ_URL);
        // 2. Create a channel
        channel = await connection.createChannel();
        console.log('Connected to RabbitMQ');
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
    }
};

const publishEvent = async (queue, message) => {
    try {
        if (!channel) {
            throw new Error('RabbitMQ channel is not initialized');
        }
        // 1. Assert the queue (create if it doesn't exist)
        await channel.assertQueue(queue, { durable: true });
        // 2. Send the message to the queue
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
        console.log(`Message sent to queue ${queue}:`, message);
    } catch (error) {
        console.error('Failed to publish event:', error);
    }
};

module.exports = { connectRabbitMQ, publishEvent };

