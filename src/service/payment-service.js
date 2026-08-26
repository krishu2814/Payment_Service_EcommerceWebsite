const PaymentRepository = require("../repository/payment-repository");
const OrderClient = require("../clients/order-client");
const Payment = require("../model/payment-model");
const { publishEvent } = require("../config/rabbitmq");
const gatewayFactory = require("../gateways/gateway-factory");

class PaymentService {
  constructor() {
    this.paymentRepository = new PaymentRepository();
    this.orderClient = new OrderClient();
  }

  getGatewayConfig() {
    return gatewayFactory.getActiveGateways();
  }

  async getOrderDetailsForPayment(orderId, authorization) {
    try {
      return await this.orderClient.getOrder(orderId, authorization);
    } catch (error) {
      console.error("Failed to fetch order from Order Service:", error.message);
      throw new Error("Unable to fetch order details");
    }
  }

  /**
   * Creates a payment intent/session on Stripe or Razorpay
   */
  async createPaymentIntent(userId, data, authorization) {
    const { orderId, paymentMethod = "CARD", preferredGateway, idempotencyKey } = data;

    if (!orderId) throw new Error("Order ID is required");
    if (!authorization) throw new Error("Authorization token is required");

    // Idempotency check
    if (idempotencyKey) {
      const existing = await this.paymentRepository.getPaymentByIdempotencyKey(idempotencyKey);
      if (existing && existing.status === "SUCCESS") {
        return {
          payment: existing,
          alreadyProcessed: true,
        };
      }
    }

    const order = await this.getOrderDetailsForPayment(orderId, authorization);

    if (!order?.items?.length) throw new Error("Invalid order data");
    if (String(order.userId) !== String(userId)) {
      throw new Error("Order does not belong to this user");
    }
    if (order.orderStatus === "CANCELLED" || order.paymentStatus === "SUCCESS") {
      throw new Error("Order cannot be paid");
    }
    if (order.orderStatus !== "READY_FOR_PAYMENT" && order.orderStatus !== "PENDING") {
      throw new Error(`Order is not ready for payment (Status: ${order.orderStatus})`);
    }

    const amount = order.totalAmount;
    const gateway = gatewayFactory.getGateway(paymentMethod, preferredGateway);

    let sessionDetails;
    if (gateway.name === "STRIPE") {
      sessionDetails = await gateway.createPaymentIntent({
        amount,
        orderId,
        userId,
        metadata: { orderNumber: order.orderNumber },
      });
    } else if (gateway.name === "RAZORPAY") {
      sessionDetails = await gateway.createOrder({
        amount,
        currency: "INR",
        orderId,
        userId,
      });
    } else if (gateway.name === "COD") {
      sessionDetails = await gateway.processOrder({
        amount,
        orderId,
        userId,
      });
    }

    // Upsert payment record
    let payment = await this.paymentRepository.getPaymentByOrderId(orderId);
    const paymentPayload = {
      orderId,
      userId,
      amount,
      currency: sessionDetails?.currency || "USD",
      paymentMethod: paymentMethod.toUpperCase(),
      gateway: gateway.name,
      gatewayPaymentId: sessionDetails?.paymentIntentId || sessionDetails?.transactionId || null,
      gatewayOrderId: sessionDetails?.orderId || null,
      clientSecret: sessionDetails?.clientSecret || null,
      idempotencyKey: idempotencyKey || null,
      status: gateway.name === "COD" ? "SUCCESS" : "PENDING",
      transactionId: gateway.name === "COD" ? sessionDetails.transactionId : null,
    };

    if (payment) {
      payment = await this.paymentRepository.updatePayment(payment._id, paymentPayload);
    } else {
      payment = await this.paymentRepository.createPayment(paymentPayload);
    }

    // If COD, immediately emit PAYMENT_SUCCESS event
    if (gateway.name === "COD") {
      await publishEvent("PAYMENT_SUCCESS", {
        event: "PAYMENT_SUCCESS",
        orderId,
        userId,
        amount,
        gateway: "COD",
        transactionId: sessionDetails.transactionId,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      payment,
      sessionDetails,
    };
  }

  /**
   * Verifies client-side payment completion (Stripe confirmation or Razorpay signature)
   */
  async verifyPayment(userId, data, authorization) {
    const { orderId, gateway: gatewayName, paymentIntentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;

    if (!orderId) throw new Error("Order ID is required");

    let payment = await this.paymentRepository.getPaymentByOrderId(orderId);
    if (!payment) throw new Error("Payment record not found for this order");

    if (payment.status === "SUCCESS") {
      return { success: true, payment, message: "Payment already confirmed" };
    }

    const gateway = gatewayFactory.getGatewayByName(gatewayName || payment.gateway);
    if (!gateway) throw new Error(`Unsupported payment gateway: ${gatewayName}`);

    let verificationResult;
    if (gateway.name === "RAZORPAY") {
      verificationResult = gateway.verifyPaymentSignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });
    } else if (gateway.name === "STRIPE") {
      verificationResult = await gateway.confirmPayment(paymentIntentId || payment.gatewayPaymentId);
    } else {
      verificationResult = { isValid: true, status: "SUCCESS", transactionId: payment.transactionId || `TXN_${Date.now()}` };
    }

    const isSuccess = verificationResult.isValid !== false && verificationResult.status === "SUCCESS";
    const transactionId = verificationResult.transactionId || `TXN_${Date.now()}`;

    if (isSuccess) {
      payment.status = "SUCCESS";
      payment.transactionId = transactionId;
      payment.receiptUrl = verificationResult.receiptUrl || payment.receiptUrl;
      await payment.save();

      await publishEvent("PAYMENT_SUCCESS", {
        event: "PAYMENT_SUCCESS",
        orderId,
        userId,
        amount: payment.amount,
        gateway: gateway.name,
        transactionId,
        timestamp: new Date().toISOString(),
      });

      return { success: true, payment, transactionId };
    } else {
      const reason = verificationResult.reason || "Payment signature or intent verification failed";
      payment.status = "FAILED";
      payment.failureReason = reason;
      await payment.save();

      await publishEvent("PAYMENT_FAILED", {
        event: "PAYMENT_FAILED",
        orderId,
        userId,
        amount: payment.amount,
        gateway: gateway.name,
        reason,
        timestamp: new Date().toISOString(),
      });

      return { success: false, reason, payment };
    }
  }

  /**
   * Direct payment processor supporting Card, UPI, COD, and Simulator modes
   */
  async processPayment(userId, data, authorization) {
    const { orderId, paymentMethod = "CARD", preferredGateway, simulateFailure, failureReason, idempotencyKey } = data;

    if (!orderId) throw new Error("Order ID is required");
    if (!paymentMethod) throw new Error("Payment method is required");
    if (!authorization) throw new Error("Authorization token is required");

    // Idempotency verification
    if (idempotencyKey) {
      const existing = await this.paymentRepository.getPaymentByIdempotencyKey(idempotencyKey);
      if (existing && existing.status === "SUCCESS") {
        return existing;
      }
    }

    const order = await this.getOrderDetailsForPayment(orderId, authorization);

    if (!order?.items?.length) throw new Error("Invalid order data");
    if (String(order.userId) !== String(userId)) {
      throw new Error("Order does not belong to this user");
    }

    const amount = order.totalAmount;
    const methodUpper = String(paymentMethod).toUpperCase();

    if (order.orderStatus === "CANCELLED" || order.paymentStatus === "SUCCESS") {
      throw new Error("Order cannot be paid");
    }

    if (order.orderStatus !== "READY_FOR_PAYMENT" && order.orderStatus !== "PENDING") {
      throw new Error(`Order is not ready for payment (status: ${order.orderStatus})`);
    }

    const existingPayment = await this.paymentRepository.getPaymentByOrderId(orderId);
    if (existingPayment && existingPayment.status === "SUCCESS") {
      return existingPayment;
    }

    const gateway = gatewayFactory.getGateway(paymentMethod, preferredGateway);

    let payment = existingPayment;
    if (!payment) {
      payment = await this.paymentRepository.createPayment({
        orderId,
        userId,
        amount,
        currency: "USD",
        paymentMethod: methodUpper,
        gateway: gateway.name,
        idempotencyKey: idempotencyKey || null,
        status: simulateFailure ? "FAILED" : "PENDING",
      });
    }

    if (simulateFailure) {
      const reason = failureReason || "Payment transaction was declined by issuing bank (Simulated Saga Failure)";
      payment.status = "FAILED";
      payment.failureReason = reason;
      await payment.save();

      await publishEvent("PAYMENT_FAILED", {
        event: "PAYMENT_FAILED",
        orderId,
        userId,
        amount,
        gateway: gateway.name,
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
      let transactionId = `TXN_${gateway.name}_${Date.now()}`;
      let receiptUrl = null;

      if (gateway.name === "COD") {
        const codRes = await gateway.processOrder({ amount, orderId, userId });
        transactionId = codRes.transactionId;
      } else if (gateway.name === "STRIPE") {
        const intentRes = await gateway.createPaymentIntent({ amount, orderId, userId });
        transactionId = intentRes.paymentIntentId;
      } else if (gateway.name === "RAZORPAY") {
        const orderRes = await gateway.createOrder({ amount, orderId, userId });
        transactionId = `pay_${orderRes.orderId}`;
      }

      payment.status = "SUCCESS";
      payment.transactionId = transactionId;
      payment.receiptUrl = receiptUrl;
      await payment.save();

      await publishEvent("PAYMENT_SUCCESS", {
        event: "PAYMENT_SUCCESS",
        orderId,
        userId,
        amount,
        gateway: gateway.name,
        transactionId,
        timestamp: new Date().toISOString(),
      });

      return payment;
    } catch (error) {
      console.error("[PaymentService] Payment processing failure:", error.message);

      payment.status = "FAILED";
      payment.failureReason = error.message;
      await payment.save();

      await publishEvent("PAYMENT_FAILED", {
        event: "PAYMENT_FAILED",
        orderId,
        userId,
        amount,
        gateway: gateway.name,
        reason: error.message || "Payment post-processing failed",
        timestamp: new Date().toISOString(),
      });

      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Asynchronous Webhook processor for Stripe & Razorpay
   */
  async handleWebhook(gatewayName, rawBody, signatureHeader) {
    const gateway = gatewayFactory.getGatewayByName(gatewayName);
    if (!gateway) throw new Error(`Invalid gateway for webhook: ${gatewayName}`);

    const event = gateway.verifyWebhookSignature(rawBody, signatureHeader);

    console.log(`[PaymentService] Verified Webhook from ${gateway.name}:`, event?.type || event?.event || "event");

    // Stripe Webhook Events
    if (gateway.name === "STRIPE") {
      const eventType = event.type;
      const paymentIntent = event.data?.object;

      if (eventType === "payment_intent.succeeded" && paymentIntent) {
        const orderId = paymentIntent.metadata?.orderId;
        const userId = paymentIntent.metadata?.userId;
        const payment = await this.paymentRepository.getPaymentByGatewayPaymentId(paymentIntent.id);

        if (payment && payment.status !== "SUCCESS") {
          payment.status = "SUCCESS";
          payment.transactionId = paymentIntent.id;
          payment.receiptUrl = paymentIntent.charges?.data?.[0]?.receipt_url || null;
          await payment.save();

          await publishEvent("PAYMENT_SUCCESS", {
            event: "PAYMENT_SUCCESS",
            orderId: payment.orderId,
            userId: payment.userId || userId,
            amount: payment.amount,
            gateway: "STRIPE",
            transactionId: paymentIntent.id,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (eventType === "payment_intent.payment_failed" && paymentIntent) {
        const payment = await this.paymentRepository.getPaymentByGatewayPaymentId(paymentIntent.id);
        if (payment && payment.status !== "SUCCESS") {
          payment.status = "FAILED";
          payment.failureReason = paymentIntent.last_payment_error?.message || "Stripe payment failed";
          await payment.save();

          await publishEvent("PAYMENT_FAILED", {
            event: "PAYMENT_FAILED",
            orderId: payment.orderId,
            userId: payment.userId,
            amount: payment.amount,
            gateway: "STRIPE",
            reason: payment.failureReason,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Razorpay Webhook Events
    if (gateway.name === "RAZORPAY") {
      const eventType = event.event;
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;

      if (eventType === "payment.captured" && paymentEntity) {
        const payment = await this.paymentRepository.getPaymentByGatewayOrderId(razorpayOrderId);
        if (payment && payment.status !== "SUCCESS") {
          payment.status = "SUCCESS";
          payment.transactionId = paymentEntity.id;
          await payment.save();

          await publishEvent("PAYMENT_SUCCESS", {
            event: "PAYMENT_SUCCESS",
            orderId: payment.orderId,
            userId: payment.userId,
            amount: payment.amount,
            gateway: "RAZORPAY",
            transactionId: paymentEntity.id,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (eventType === "payment.failed" && paymentEntity) {
        const payment = await this.paymentRepository.getPaymentByGatewayOrderId(razorpayOrderId);
        if (payment && payment.status !== "SUCCESS") {
          payment.status = "FAILED";
          payment.failureReason = paymentEntity.error_description || "Razorpay payment failed";
          await payment.save();

          await publishEvent("PAYMENT_FAILED", {
            event: "PAYMENT_FAILED",
            orderId: payment.orderId,
            userId: payment.userId,
            amount: payment.amount,
            gateway: "RAZORPAY",
            reason: payment.failureReason,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return { received: true };
  }

  async getPaymentDetails(paymentId) {
    return await this.paymentRepository.getPaymentById(paymentId);
  }

  async getPaymentByOrderId(orderId) {
    return await this.paymentRepository.getPaymentByOrderId(orderId);
  }
}

module.exports = PaymentService;

