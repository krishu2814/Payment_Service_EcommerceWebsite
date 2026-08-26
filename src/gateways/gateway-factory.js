const StripeGateway = require("./stripe-gateway");
const RazorpayGateway = require("./razorpay-gateway");
const CodGateway = require("./cod-gateway");

class GatewayFactory {
  constructor() {
    this.stripeGateway = new StripeGateway();
    this.razorpayGateway = new RazorpayGateway();
    this.codGateway = new CodGateway();
  }

  getGateway(paymentMethod = "CARD", preferredGateway = null) {
    const method = String(paymentMethod).toUpperCase();
    const pref = preferredGateway ? String(preferredGateway).toUpperCase() : null;

    if (pref === "STRIPE" || method === "CARD" || method === "STRIPE") {
      return this.stripeGateway;
    }

    if (pref === "RAZORPAY" || method === "UPI" || method === "NETBANKING" || method === "RAZORPAY") {
      return this.razorpayGateway;
    }

    if (method === "COD" || pref === "COD") {
      return this.codGateway;
    }

    // Default to Stripe for card/unknown methods
    return this.stripeGateway;
  }

  getGatewayByName(name) {
    const normalized = String(name).toUpperCase();
    if (normalized === "STRIPE") return this.stripeGateway;
    if (normalized === "RAZORPAY") return this.razorpayGateway;
    if (normalized === "COD") return this.codGateway;
    return null;
  }

  getActiveGateways() {
    return {
      stripe: {
        enabled: true,
        isLive: this.stripeGateway.isConfigured,
        mode: this.stripeGateway.isConfigured ? "LIVE" : "SANDBOX_SIMULATOR",
        supportedMethods: ["CARD", "APPLE_PAY", "GOOGLE_PAY"],
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "pk_test_mock_sandbox_key",
      },
      razorpay: {
        enabled: true,
        isLive: this.razorpayGateway.isConfigured,
        mode: this.razorpayGateway.isConfigured ? "LIVE" : "SANDBOX_SIMULATOR",
        supportedMethods: ["UPI", "NETBANKING", "CARD"],
        keyId: this.razorpayGateway.keyId,
      },
      cod: {
        enabled: true,
        isLive: true,
        mode: "STANDARD",
        supportedMethods: ["COD"],
      },
    };
  }
}

module.exports = new GatewayFactory();
