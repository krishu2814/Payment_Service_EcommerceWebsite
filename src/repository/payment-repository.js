const Payment = require('../model/payment-model');

class PaymentRepository {
    async createPayment(paymentData) {
        return await Payment.create(paymentData);
    }

    async getPaymentById(paymentId) {
        return await Payment.findById(paymentId);
    }
    
    // This is the Update Path. Mongoose wraps these in a $set operator automatically. It tells MongoDB: "Change these two fields, but leave the rest of the document alone.
    // mongoose will only update the fields specified in the update object, and it won't modify any other fields in the document. 
    // This is a common pattern for updating documents in MongoDB, as it allows you to make partial updates without affecting the entire document.
    async updatePaymentStatus(paymentId, status, transactionId) {
        return await Payment.findByIdAndUpdate(paymentId, { status, transactionId }, { new: true });
    }
}

module.exports = PaymentRepository;
