const PaymentRepository = require("../repository/payment-repository");
const OrderClient = require("../clients/order-client");
const Payment = require("../model/payment-model");
const { publishEvent } = require("../config/rabbitmq");

class PaymentService {
  constructor() {
    this.paymentRepository = new PaymentRepository();
    this.orderClient = new OrderClient();
  }

  async getOrderDetailsForPayment(orderId, authorization) {
    try {
      return await this.orderClient.getOrder(orderId, authorization);
    } catch (error) {
      console.error("Failed to fetch order from Order Service:", error.message);

      throw new Error("Unable to fetch order details");
    }
  }

  async processPayment(userId, data, authorization) {
    const { orderId, paymentMethod } = data;

    if (!orderId) {
      throw new Error("Order ID is required");
    }

    if (!paymentMethod) {
      throw new Error("Payment method is required");
    }

    if (!authorization) {
      throw new Error("Authorization token is required");
    }

    const order = await this.getOrderDetailsForPayment(orderId, authorization);

    if (!order?.items?.length) {
      throw new Error("Invalid order data");
    }

    if (String(order.userId) !== String(userId)) {
      throw new Error("Order does not belong to this user");
    }

    const amount = order.totalAmount;

    const validPaymentMethods = Payment.schema.path("paymentMethod").enumValues;

    if (!validPaymentMethods.includes(paymentMethod)) {
      throw new Error("Invalid payment method");
    }

    if (
      order.orderStatus === "CANCELLED" ||
      order.paymentStatus === "SUCCESS"
    ) {
      throw new Error("Order cannot be paid");
    }

    if (order.orderStatus !== "READY_FOR_PAYMENT") {
      throw new Error("Order is not ready for payment");
    }

    const existingPayment =
      await this.paymentRepository.getPaymentByOrderId(orderId);

    if (existingPayment && existingPayment.status === "SUCCESS") {
      return existingPayment;
    }

    const { simulateFailure, failureReason } = data;

    const payment = await this.paymentRepository.createPayment({
      orderId,
      userId,
      amount,
      paymentMethod,
      status: simulateFailure ? "FAILED" : "PENDING",
    });

    if (!payment) {
      throw new Error("Payment creation failed");
    }

    if (simulateFailure) {
      const reason = failureReason || "Payment transaction was declined by bank (Simulated Failure)";
      await publishEvent("PAYMENT_FAILED", {
        event: "PAYMENT_FAILED",
        orderId,
        userId,
        amount,
        reason,
        timestamp: new Date().toISOString(),
      });

      return {
        ...payment.toObject(),
        failed: true,
        reason,
      };
    }

    try {
      const transactionId = `TXN_${Date.now()}`;

      payment.status = "SUCCESS";
      payment.transactionId = transactionId;

      await payment.save();

      await publishEvent("PAYMENT_SUCCESS", {
        event: "PAYMENT_SUCCESS",
        orderId,
        userId,
        amount,
        transactionId,
        timestamp: new Date().toISOString(),
      });

      return payment;
    } catch (error) {
      console.error("Payment processing failed:", error.message);

      payment.status = "FAILED";
      await payment.save();

      await publishEvent("PAYMENT_FAILED", {
        event: "PAYMENT_FAILED",
        orderId,
        userId,
        amount,
        reason: error.message || "Payment post-processing failed",
        timestamp: new Date().toISOString(),
      });

      throw new Error("Payment processing failed and compensation event emitted");
    }
  }

  async getPaymentDetails(paymentId) {
    return await this.paymentRepository.getPaymentById(paymentId);
  }
}

module.exports = PaymentService;
