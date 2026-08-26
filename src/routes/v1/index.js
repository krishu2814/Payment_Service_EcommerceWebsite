const express = require("express");
const router = express.Router();
const Authentication = require("../../middleware/authentication");
const PaymentController = require("../../controller/payment-controller");

const paymentController = new PaymentController();

// Public gateway configuration discovery
router.get("/config", paymentController.getGatewayConfig.bind(paymentController));

// Webhook endpoints (external server-to-server callback, verified via cryptographic signatures)
router.post("/webhook/:gateway", paymentController.handleWebhook.bind(paymentController));

// Protected User Payment Routes
router.post("/create-intent", Authentication, paymentController.createPaymentIntent.bind(paymentController));
router.post("/verify", Authentication, paymentController.verifyPayment.bind(paymentController));
router.post("/", Authentication, paymentController.processPayment.bind(paymentController));

// Order Payment Status Lookup
router.get("/order/:orderId", Authentication, paymentController.getPaymentByOrderId.bind(paymentController));
router.get("/:id", Authentication, paymentController.getPaymentDetails.bind(paymentController));

module.exports = router;

