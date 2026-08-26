const Stripe = require("stripe");
const {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  DEFAULT_CURRENCY,
} = require("../config/serverConfig");

class StripeGateway {
  constructor() {
    this.name = "STRIPE";
    this.isConfigured = Boolean(STRIPE_SECRET_KEY && STRIPE_SECRET_KEY.startsWith("sk_"));
    this.client = this.isConfigured ? new Stripe(STRIPE_SECRET_KEY) : null;
    this.webhookSecret = STRIPE_WEBHOOK_SECRET;
  }

  /**
   * Creates a Stripe PaymentIntent for the client to confirm
   */
  async createPaymentIntent({ amount, currency = DEFAULT_CURRENCY, orderId, userId, metadata = {} }) {
    if (!this.isConfigured) {
      // Graceful fallback for sandbox/local testing without active Stripe secret key
      const mockIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const mockClientSecret = `${mockIntentId}_secret_${Math.random().toString(36).substring(2, 12)}`;
      return {
        isMock: true,
        gateway: this.name,
        paymentIntentId: mockIntentId,
        clientSecret: mockClientSecret,
        amount,
        currency: currency.toLowerCase(),
        status: "requires_payment_method",
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "pk_test_mock_sandbox_key",
      };
    }

    try {
      // Stripe expects amount in smallest currency unit (cents/paise)
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await this.client.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        metadata: {
          orderId: String(orderId),
          userId: String(userId),
          ...metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        isMock: false,
        gateway: this.name,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
      };
    } catch (error) {
      console.error("[StripeGateway] Error creating PaymentIntent:", error.message);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  /**
   * Fetches latest PaymentIntent status directly from Stripe API
   */
  async confirmPayment(paymentIntentId) {
    if (!this.isConfigured) {
      return {
        success: true,
        status: "SUCCESS",
        transactionId: paymentIntentId || `txn_stripe_${Date.now()}`,
        gateway: this.name,
        receiptUrl: null,
      };
    }

    try {
      const paymentIntent = await this.client.paymentIntents.retrieve(paymentIntentId);

      const isSuccess = paymentIntent.status === "succeeded";
      const isFailed = ["canceled", "requires_payment_method"].includes(paymentIntent.status);

      return {
        success: isSuccess,
        status: isSuccess ? "SUCCESS" : isFailed ? "FAILED" : "PENDING",
        transactionId: paymentIntent.id,
        gateway: this.name,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        receiptUrl: paymentIntent.charges?.data?.[0]?.receipt_url || null,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      console.error("[StripeGateway] Error confirming payment:", error.message);
      throw new Error(`Stripe confirmation error: ${error.message}`);
    }
  }

  /**
   * Cryptographically verifies Stripe Webhook Signature
   */
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!this.isConfigured || !this.webhookSecret) {
      // In sandbox mode without keys, parse JSON safely
      try {
        const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
        return payload;
      } catch {
        return rawBody;
      }
    }

    try {
      return this.client.webhooks.constructEvent(
        rawBody,
        signatureHeader,
        this.webhookSecret
      );
    } catch (error) {
      console.error("[StripeGateway] Webhook signature verification failed:", error.message);
      throw new Error(`Stripe webhook signature invalid: ${error.message}`);
    }
  }

  /**
   * Processes a real refund via Stripe
   */
  async processRefund({ paymentIntentId, amount, reason = "requested_by_customer" }) {
    if (!this.isConfigured) {
      return {
        success: true,
        refundId: `re_mock_${Date.now()}`,
        status: "succeeded",
        amount,
      };
    }

    try {
      const refundParams = {
        payment_intent: paymentIntentId,
        reason,
      };
      if (amount) {
        refundParams.amount = Math.round(amount * 100);
      }

      const refund = await this.client.refunds.create(refundParams);
      return {
        success: refund.status === "succeeded",
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
      };
    } catch (error) {
      console.error("[StripeGateway] Refund error:", error.message);
      throw new Error(`Stripe refund failed: ${error.message}`);
    }
  }
}

module.exports = StripeGateway;
