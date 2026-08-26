class CodGateway {
  constructor() {
    this.name = "COD";
    this.isConfigured = true;
  }

  async processOrder({ amount, orderId, userId }) {
    const transactionId = `COD_${Date.now()}_${String(orderId).slice(-6)}`;
    return {
      success: true,
      status: "SUCCESS",
      gateway: this.name,
      transactionId,
      amount,
      paymentMethod: "COD",
      message: "Order placed successfully with Cash on Delivery",
    };
  }
}

module.exports = CodGateway;
