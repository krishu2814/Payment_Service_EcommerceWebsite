const Razorpay = require("razorpay");
const crypto = require("crypto");
const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
  DEFAULT_CURRENCY,
} = require("../config/serverConfig");

class RazorpayGateway {
  constructor() {
    this.name = "RAZORPAY";
    this.isConfigured = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
    this.client = this.isConfigured
      ? new Razorpay({
          key_id: RAZORPAY_KEY_ID,
          key_secret: RAZORPAY_KEY_SECRET,
        })
      : null;
    this.keyId = RAZORPAY_KEY_ID || "rzp_test_mock_sandbox_key";
    this.keySecret = RAZORPAY_KEY_SECRET;
    this.webhookSecret = RAZORPAY_WEBHOOK_SECRET;
  }

  /**
   * Creates a Razorpay Order
   */
  async createOrder({ amount, currency = "INR", orderId, userId, notes = {} }) {
    if (!this.isConfigured) {
      // Graceful fallback for testing
      const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        isMock: true,
        gateway: this.name,
        orderId: mockOrderId,
        amount,
        currency,
        keyId: this.keyId,
        status: "created",
      };
    }

    try {
      const amountInPaise = Math.round(amount * 100);

      const options = {
        amount: amountInPaise,
        currency: currency.toUpperCase(),
        receipt: `rcpt_${String(orderId).slice(-16)}`,
        notes: {
          orderId: String(orderId),
          userId: String(userId),
          ...notes,
        },
      };

      const order = await this.client.orders.create(options);

      return {
        isMock: false,
        gateway: this.name,
        orderId: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        keyId: this.keyId,
        status: order.status,
      };
    } catch (error) {
      console.error("[RazorpayGateway] Error creating Order:", error.message);
      throw new Error(`Razorpay error: ${error.message}`);
    }
  }

  /**
   * Verifies HMAC-SHA256 signature returned by Razorpay Checkout
   */
  verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    if (!this.isConfigured) {
      return {
        isValid: true,
        transactionId: razorpayPaymentId || `pay_mock_${Date.now()}`,
        status: "SUCCESS",
      };
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return {
        isValid: false,
        reason: "Missing Razorpay verification parameters",
      };
    }

    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", this.keySecret)
      .update(payload)
      .digest("hex");

    const isValid = expectedSignature === razorpaySignature;

    return {
      isValid,
      transactionId: razorpayPaymentId,
      status: isValid ? "SUCCESS" : "FAILED",
      reason: isValid ? null : "Invalid HMAC-SHA256 signature",
    };
  }

  /**
   * Cryptographically verifies Razorpay Webhook signature
   */
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!this.isConfigured || !this.webhookSecret) {
      try {
        return typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      } catch {
        return rawBody;
      }
    }

    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody))
      .digest("hex");

    if (expectedSignature !== signatureHeader) {
      throw new Error("Razorpay webhook signature verification failed");
    }

    return typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
  }

  /**
   * Processes a real refund via Razorpay API
   */
  async processRefund({ paymentId, amount, notes = {} }) {
    if (!this.isConfigured) {
      return {
        success: true,
        refundId: `rfnd_mock_${Date.now()}`,
        status: "processed",
        amount,
      };
    }

    try {
      const refundOptions = { notes };
      if (amount) {
        refundOptions.amount = Math.round(amount * 100);
      }

      const refund = await this.client.payments.refund(paymentId, refundOptions);
      return {
        success: refund.status === "processed",
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
      };
    } catch (error) {
      console.error("[RazorpayGateway] Refund error:", error.message);
      throw new Error(`Razorpay refund failed: ${error.message}`);
    }
  }
}

module.exports = RazorpayGateway;
