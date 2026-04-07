const express = require('express');
const router = express.Router();
const Authetication = require('../../middleware/authentication');

const PaymentController = require('../../controller/payment-controller');

const paymentController = new PaymentController();

// JWT in headers
router.post('/pay', Authetication, paymentController.processPayment.bind(paymentController));
router.get('/payment-details/:id', paymentController.getPaymentDetails.bind(paymentController)); 

module.exports = router;
