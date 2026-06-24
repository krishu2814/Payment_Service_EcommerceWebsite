const express = require('express');
const router = express.Router();
const Authetication = require('../../middleware/authentication');

const PaymentController = require('../../controller/payment-controller');

const paymentController = new PaymentController();

// JWT in headers
router.post('/', Authetication, paymentController.processPayment.bind(paymentController));
router.get('/:id', paymentController.getPaymentDetails.bind(paymentController)); 

module.exports = router;
