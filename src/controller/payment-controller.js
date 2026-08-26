const PaymentService = require("../service/payment-service");

class PaymentController {
  constructor() {
    this.paymentService = new PaymentService();
  }

  getGatewayConfig(req, res) {
    try {
      const config = this.paymentService.getGatewayConfig();
      return res.status(200).json({
        success: true,
        message: "Payment gateway configurations fetched successfully",
        data: config,
        error: {},
      });
    } catch (error) {
      console.error("[PaymentController] Error fetching gateway config:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch gateway configuration",
        data: {},
        error: error.message,
      });
    }
  }

  async createPaymentIntent(req, res) {
    try {
      const userId = req.user.id || req.user._id;
      const authorization = req.headers.authorization;
      const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey;

      const result = await this.paymentService.createPaymentIntent(
        userId,
        { ...req.body, idempotencyKey },
        authorization
      );

      return res.status(200).json({
        success: true,
        message: "Payment session initialized successfully",
        data: result,
        error: {},
      });
    } catch (error) {
      console.error("[PaymentController] Error creating payment intent:", error.message);
      return res.status(error.message.includes("not ready") ? 400 : 500).json({
        success: false,
        message: error.message || "Failed to initialize payment session",
        data: {},
        error: error.message,
      });
    }
  }

  async verifyPayment(req, res) {
    try {
      const userId = req.user.id || req.user._id;
      const authorization = req.headers.authorization;

      const result = await this.paymentService.verifyPayment(
        userId,
        req.body,
        authorization
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.reason || "Payment verification failed",
          data: result,
          error: { reason: result.reason },
        });
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified and confirmed successfully",
        data: result,
        error: {},
      });
    } catch (error) {
      console.error("[PaymentController] Error verifying payment:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to verify payment",
        data: {},
        error: error.message,
      });
    }
  }

  async processPayment(req, res) {
    try {
      const userId = req.user.id || req.user._id;
      const authorization = req.headers.authorization;
      const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey;

      const paymentResult = await this.paymentService.processPayment(
        userId,
        { ...req.body, idempotencyKey },
        authorization
      );

      if (paymentResult?.failed || paymentResult?.status === "FAILED") {
        return res.status(400).json({
          success: false,
          message: paymentResult.reason || "Payment transaction failed",
          data: paymentResult,
          error: { reason: paymentResult.reason },
        });
      }

      return res.status(200).json({
        success: true,
        message: "Payment processed successfully",
        data: paymentResult,
        error: {},
      });
    } catch (error) {
      console.error("[PaymentController] Error processing payment:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to process payment",
        data: {},
        error: error.message,
      });
    }
  }

  async handleWebhook(req, res) {
    try {
      const gateway = req.params.gateway || "stripe";
      const signature =
        req.headers["stripe-signature"] ||
        req.headers["x-razorpay-signature"] ||
        "";

      const result = await this.paymentService.handleWebhook(
        gateway,
        req.body,
        signature
      );

      return res.status(200).json({
        success: true,
        message: "Webhook processed successfully",
        data: result,
      });
    } catch (error) {
      console.error("[PaymentController] Webhook processing error:", error.message);
      return res.status(400).json({
        success: false,
        message: error.message || "Webhook verification failed",
      });
    }
  }

  async getPaymentByOrderId(req, res) {
    try {
      const orderId = req.params.orderId;
      const payment = await this.paymentService.getPaymentByOrderId(orderId);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found for this order",
          data: {},
          error: {},
        });
      }

      return res.status(200).json({
        success: true,
        message: "Payment details fetched successfully",
        data: payment,
        error: {},
      });
    } catch (error) {
      console.error("[PaymentController] Error fetching payment by order ID:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch payment details",
        data: {},
        error: error.message,
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
          message: "Payment not found",
          data: {},
          error: {},
        });
      }

      return res.status(200).json({
        success: true,
        message: "Payment details fetched successfully",
        data: paymentDetails,
        error: {},
      });
    } catch (error) {
      console.error("[PaymentController] Error fetching payment details:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch payment details",
        data: {},
        error: error.message,
      });
    }
  }
}

module.exports = PaymentController;

