const Payment = require("../model/payment-model");

class PaymentRepository {
  async createPayment(paymentData) {
    return await Payment.create(paymentData);
  }

  async getPaymentById(paymentId) {
    return await Payment.findById(paymentId);
  }

  async updatePayment(paymentId, updateData) {
    return await Payment.findByIdAndUpdate(paymentId, updateData, { new: true });
  }

  async updatePaymentStatus(paymentId, status, transactionId, extra = {}) {
    return await Payment.findByIdAndUpdate(
      paymentId,
      { status, transactionId, ...extra },
      { new: true }
    );
  }

  async getPaymentsByUserId(userId) {
    return await Payment.find({ userId }).sort({ createdAt: -1 });
  }

  async getPaymentByOrderId(orderId) {
    return await Payment.findOne({ orderId });
  }

  async getPaymentByGatewayOrderId(gatewayOrderId) {
    return await Payment.findOne({ gatewayOrderId });
  }

  async getPaymentByGatewayPaymentId(gatewayPaymentId) {
    return await Payment.findOne({ gatewayPaymentId });
  }

  async getPaymentByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null;
    return await Payment.findOne({ idempotencyKey });
  }
}

module.exports = PaymentRepository;

