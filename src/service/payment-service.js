const PaymentRepository = require('../repository/payment-repository');
const { ORDER_SERVICE_URL } = require('../config/serverConfig');
const axios = require('axios');

class PaymentService {
    constructor() {
        this.paymentRepository = new PaymentRepository();
    }

    async processPayment(userId, data) {
        // 1) fetch payment method and order id from user and order service
        const { orderId, paymentMethod, amount } = data;
        console.log('Processing payment for orderId:', orderId, 'with payment method:', paymentMethod, 'and amount:', amount);

        // 2) get order details from order service using orderId (not implemented here, just a placeholder)
        const orderDetails = await axios.get(`${ORDER_SERVICE_URL}/api/v1/orders/${orderId}`);
        if(!orderDetails) {
            throw new Error('Order not found');
        }
        console.log('Order details:', orderDetails.data);
        // 3) process payment with third party payment gateway
        let payment = await this.paymentRepository.createPayment({
            orderId,
            userId,
            amount,
            paymentMethod,
            status: 'PENDING'
        });
        // console.log('Payment created with status PENDING:', payment);

        if(!payment) {
            throw new Error('Payment creation failed');
        }

        // 4) update payment status in database
        if (payment) {
            payment.status = 'SUCCESS';
            payment.transactionId = `TXN_${Date.now()}`;
            await payment.save();
        
            // update order service about payment service
            await axios.patch(`${ORDER_SERVICE_URL}/api/v1/orders/${orderId}`, {
                orderStatus: "PLACED",
                paymentStatus: payment.status
            });
        } else {
            await axios.patch(`${ORDER_SERVICE_URL}/api/v1/orders/${orderId}`, {
                orderStatus: "CANCELLED",
                paymentStatus: payment.status
            });
        }   

        // 5) return response to user and order service
        return payment;
    }
    async getPaymentDetails(paymentId) {
        return await this.paymentRepository.getPaymentById(paymentId);
    }

}

module.exports = PaymentService;
