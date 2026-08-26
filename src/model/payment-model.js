const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      unique: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "USD",
    },

    paymentMethod: {
      type: String,
      enum: ["CARD", "UPI", "NETBANKING", "COD", "STRIPE", "RAZORPAY"],
      required: true,
    },

    gateway: {
      type: String,
      enum: ["STRIPE", "RAZORPAY", "COD", "SIMULATOR"],
      default: "STRIPE",
    },

    gatewayPaymentId: {
      type: String,
      index: true,
    },

    gatewayOrderId: {
      type: String,
      index: true,
    },

    clientSecret: {
      type: String,
    },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },

    transactionId: {
      type: String,
      index: true,
    },

    idempotencyKey: {
      type: String,
      index: true,
    },

    receiptUrl: {
      type: String,
    },

    failureReason: {
      type: String,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;

