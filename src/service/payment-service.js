const PaymentRepository = require('../repository/payment-repository');
const { ORDER_SERVICE_URL, CART_SERVICE_URL } = require('../config/serverConfig');
const axios = require('axios');
// const { PAYMENT_METHODS } = require('../utils/constants');
const CartClient = require('../clients/cart-client');
const OrderClient = require('../clients/order-client');
const Payment = require('../model/payment-model');

class PaymentService {
    constructor() {
        this.paymentRepository = new PaymentRepository();
        this.cartClient = new CartClient();
        this.orderClient = new OrderClient();
    }

    async clearCart(token) {
        try {
            await this.cartClient.clearUserCart(token);
        } catch (error) {
            console.error('Cart clearing failed:', error.message);
            /*
            Payment is already successful. We only log the failure.
            In production: Publish event to RabbitMQ.
            */
        }
    }

    async getOrderDetailsForPayment(orderId) {
        try {
            return await this.orderClient.getOrder(orderId);
        } catch (error) {
            throw new Error('Unable to fetch order details');
        }
        
    }

    async processPayment(userId, data, token) {

        const { orderId, paymentMethod, amount } = data;

        // 1. Fetch Order Details
        const order = await this.getOrderDetailsForPayment(orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        // 2. Check for payment method from model enum values instead of hardcoding
        const validPaymentMethods = Payment.schema.path('paymentMethod').enumValues;
        if (!validPaymentMethods.includes(paymentMethod)) {
            throw new Error('Invalid payment method');
        }

        // 3. Validate Amount

        if (Number(order.totalAmount) !== Number(amount)) {
            throw new Error('Amount mismatch');
        }

        // 4. Validate Order State
        if (order.orderStatus === 'CANCELLED' || order.paymentStatus === 'SUCCESS') {
            throw new Error('Order cannot be paid');
        }

        // 5. Prevent Duplicate Payment
        const existingPayment = await this.paymentRepository.getPaymentByOrderId(orderId);

        if (existingPayment && existingPayment.status === 'SUCCESS') {
            throw new Error('Payment already completed');
        }

        // 6. Create Payment Record
        const payment =
            await this.paymentRepository.createPayment({
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

            // 7. Simulate Gateway Success
            payment.status = 'SUCCESS';
            payment.transactionId = `TXN_${Date.now()}`;

            // Replace with actual payment gateway integration
            // (Razorpay / Stripe / PayPal)

            await payment.save();

            // 8. Update Order Service
            await this.orderClient.updateOrder(orderId, {
                orderStatus: 'PLACED',
                paymentStatus: 'SUCCESS',
                transactionId: payment.transactionId
            });

            // 9. Clear the cart after successful payment
            await this.clearCart(token);

            // 10. Return Success
            return payment;

        } catch (error) {
            console.error('Post payment operation failed', error.message);
            throw new Error('Payment completed but downstream service failed');
        }
    }

    async getPaymentDetails(paymentId) {
        return await this.paymentRepository.getPaymentById(paymentId);
    }

}

module.exports = PaymentService;
