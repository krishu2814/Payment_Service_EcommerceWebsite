const PaymentService = require('../service/payment-service');

class PaymentController {

    constructor() {
        this.paymentService = new PaymentService();
    }

    async processPayment(req, res) {
        try {
            const userId = req.user.id;// jwt
            console.log('User ID from JWT:', userId);
            console.log('Payment data:', req.body);
            const paymentData = req.body;
            const paymentResult = await this.paymentService.processPayment(userId, paymentData);
            res.status(200).json({
                success: true,
                message: 'Payment processed successfully',
                data: paymentResult,
                error: {}
            });
        } catch (error) {
            console.error('Error processing payment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process payment',
                data: {},
                error: error
            });
        }
    }

    async getPaymentDetails(req, res) {
        try {
            const paymentId = req.params.id;
            const paymentDetails = await this.paymentService.getPaymentDetails(paymentId);
            if (!paymentDetails) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found',
                    data: {},
                    error: {}
                });
            }
            res.status(200).json({
                success: true,
                message: 'Payment details fetched successfully',
                data: paymentDetails,
                error: {}
            });
        } catch (error) {
            console.error('Error fetching payment details:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch payment details',
                data: {},
                error: error
            });
        }
    }

}

module.exports = PaymentController;
           