const PaymentRepository = require('../repository/payment-repository');
const OrderClient = require('../clients/order-client');
const Payment = require('../model/payment-model');
const { publishEvent } = require('../config/rabbitmq');

class PaymentService {
    constructor() {
        this.paymentRepository = new PaymentRepository();
        this.orderClient = new OrderClient();
    }

    /**
     * Fetch order from Order Service
     */
    async getOrderDetailsForPayment(orderId) {
        try {
            const order = await this.orderClient.getOrder(orderId);
            return order;
        } catch (error) {
            throw new Error('Unable to fetch order details');
        }
    }

    /**
     * Main payment flow (EVENT DRIVEN)
     */
    async processPayment(userId, data) {

        const { orderId, paymentMethod } = data;

        // 1. Fetch Order
        const order = await this.getOrderDetailsForPayment(orderId);
        if (!order?.items?.length) {
            throw new Error('Invalid order data');
        }

        // 2. Amount comes from Order 
        // Dont take from user input to avoid tampering
        const amount = order.totalAmount;

        // 3. Validate payment method
        const validPaymentMethods = Payment.schema.path('paymentMethod').enumValues;

        if (!validPaymentMethods.includes(paymentMethod)) {
            throw new Error('Invalid payment method');
        }

        // 4. Validate order state
        if (order.orderStatus === 'CANCELLED' || order.paymentStatus === 'SUCCESS') {
            throw new Error('Order cannot be paid');
        }

        // 5. Idempotency check 
        const existingPayment =
            await this.paymentRepository.getPaymentByOrderId(orderId);

        if (existingPayment && existingPayment.status === 'SUCCESS') {
            return existingPayment; // SAFE retry handling
        }

        // 6. Create payment record
        const payment = await this.paymentRepository.createPayment({
            orderId,
            userId,
            amount,
            paymentMethod,
            status: 'PENDING'
        });

        if (!payment) {
            throw new Error('Payment creation failed');
        }

        try {

            // 7. Simulate payment success (replace with gateway later)
            const transactionId = `TXN_${Date.now()}`;

            payment.status = 'SUCCESS';
            payment.transactionId = transactionId;

            await payment.save();

            // 8. Publish event → Order Service will handle updates
            try {
                await publishEvent('PAYMENT_SUCCESS', {
                    event: 'PAYMENT_SUCCESS',
                    orderId,
                    userId,
                    amount,
                    transactionId,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                /**
                 * DLQ (Dead Letter Queue) handling can be implemented here for failed events
                 * For now, we log the error and throw a new error to indicate failure in notifying Order Service
                 */
                console.error('Failed to publish PAYMENT_SUCCESS event:', error.message);
                throw new Error('Payment completed but failed to notify Order Service');
            }

            // 9. DO NOT CALL CART SERVICE HERE
            // Cart will be cleared via ORDER_CONFIRMED event

            return payment;

        } catch (error) {
            console.error('Payment post-processing failed:', error.message);
            throw new Error('Payment completed but downstream processing failed');
        }
    }

    /**
     * Get payment by ID
     */
    async getPaymentDetails(paymentId) {
        return await this.paymentRepository.getPaymentById(paymentId);
    }
}

module.exports = PaymentService;
