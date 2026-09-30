const PaymentService = require("../service/payment-service");
const { NotFoundError, BadRequestError } = require("../utils/errors/app-error");

class PaymentController {
  constructor() {
    this.paymentService = new PaymentService();
  }

  getGatewayConfig(req, res, next) {
    try {
      const config = this.paymentService.getGatewayConfig();
      return res.status(200).json({
        success: true,
        message: "Payment gateway configurations fetched successfully",
        data: config,
        error: {},
      });
    } catch (error) {
      return next(error);
    }
  }

  async createPaymentIntent(req, res, next) {
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
      if (error.message && error.message.includes("not ready")) {
        return next(new BadRequestError(error.message));
      }
      return next(error);
    }
  }

  async verifyPayment(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const authorization = req.headers.authorization;

      const result = await this.paymentService.verifyPayment(
        userId,
        req.body,
        authorization
      );

      if (!result.success) {
        return next(new BadRequestError(result.reason || "Payment verification failed", { reason: result.reason }));
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified and confirmed successfully",
        data: result,
        error: {},
      });
    } catch (error) {
      return next(error);
    }
  }

  async processPayment(req, res, next) {
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
        return next(new BadRequestError(paymentResult.reason || "Payment transaction failed", { reason: paymentResult.reason }));
      }

      return res.status(200).json({
        success: true,
        message: "Payment processed successfully",
        data: paymentResult,
        error: {},
      });
    } catch (error) {
      return next(error);
    }
  }

  async handleWebhook(req, res, next) {
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
      return next(new BadRequestError(error.message || "Webhook verification failed"));
    }
  }

  async getPaymentByOrderId(req, res, next) {
    try {
      const orderId = req.params.orderId;
      const payment = await this.paymentService.getPaymentByOrderId(orderId);

      if (!payment) {
        return next(new NotFoundError("Payment record not found for this order"));
      }

      return res.status(200).json({
        success: true,
        message: "Payment details fetched successfully",
        data: payment,
        error: {},
      });
    } catch (error) {
      return next(error);
    }
  }

  async getPaymentDetails(req, res, next) {
    try {
      const paymentId = req.params.id;
      const paymentDetails = await this.paymentService.getPaymentDetails(paymentId);

      if (!paymentDetails) {
        return next(new NotFoundError("Payment not found"));
      }

      return res.status(200).json({
        success: true,
        message: "Payment details fetched successfully",
        data: paymentDetails,
        error: {},
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = PaymentController;

