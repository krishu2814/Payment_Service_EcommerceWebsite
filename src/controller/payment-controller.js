const PaymentService = require("../service/payment-service");

class PaymentController {
  constructor() {
    this.paymentService = new PaymentService();
  }

  async processPayment(req, res) {
    try {
      const userId = req.user.id;
      const authorization = req.headers.authorization;

      const paymentResult = await this.paymentService.processPayment(
        userId,
        req.body,
        authorization,
      );

      return res.status(200).json({
        success: true,
        message: "Payment processed successfully",
        data: paymentResult,
        error: {},
      });
    } catch (error) {
      console.error("Error processing payment:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to process payment",
        data: {},
        error: error.message,
      });
    }
  }

  async getPaymentDetails(req, res) {
    try {
      const paymentId = req.params.id;

      const paymentDetails =
        await this.paymentService.getPaymentDetails(paymentId);

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
      console.error("Error fetching payment details:", error.message);

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
