# 💳 Payment Service

A robust Payment Microservice built using **Node.js**, **Express.js**, **MongoDB**, and **Mongoose** as part of a distributed E-Commerce Microservices Architecture.

This service handles payment processing, validates orders, updates order status, generates transaction IDs, prevents duplicate payments, and clears the user's cart after successful payment.

---

## 🚀 Features

- Payment Processing
- Order Validation
- Amount Verification
- Duplicate Payment Prevention
- Payment Method Validation via Schema Enums
- Transaction ID Generation
- Order Service Integration
- Cart Service Integration
- JWT Authentication
- Repository Pattern
- Service Layer Architecture
- Error Handling & Validation
- Microservice Communication using Axios

---

## 🏗️ Microservice Architecture

```text
                    ┌─────────────────┐
                    │   API Gateway   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Payment Service │
                    └────────┬────────┘
                             │
               ┌─────────────┴─────────────┐
               │                           │
               ▼                           ▼
       ┌───────────────┐          ┌───────────────┐
       │ Order Service │          │ Cart Service  │
       └───────────────┘          └───────────────┘
```

---

## 🔄 Payment Workflow

```text
User Initiates Payment
        │
        ▼
Fetch Order Details
        │
        ▼
Validate Order
        │
        ▼
Validate Amount
        │
        ▼
Validate Payment Method
        │
        ▼
Check Existing Payment
        │
        ▼
Create Payment Record
        │
        ▼
Process Payment
        │
        ▼
Update Order Service
        │
        ▼
Clear User Cart
        │
        ▼
Payment Successful
```

---

## 🛠️ Tech Stack

### Backend
- Node.js
- Express.js

### Database
- MongoDB Atlas
- Mongoose

### Authentication
- JWT

### Communication
- REST APIs
- Axios

### Design Patterns
- Repository Pattern
- Service Layer Pattern

### Architecture
- Microservices

---

## 📁 Project Structure

```text
Payment-Service
│
├── src
│   ├── clients
│   │   ├── cart-client.js
│   │   └── order-client.js
│   │
│   ├── config
│   │
│   ├── controller
│   │
│   ├── middleware
│   │
│   ├── model
│   │   └── payment-model.js
│   │
│   ├── repository
│   │   └── payment-repository.js
│   │
│   ├── routes
│   │   └── v1
│   │
│   ├── service
│   │   └── payment-service.js
│   │
│   ├── utils
│   │
│   └── index.js
│
├── package.json
├── .env
└── README.md
```
-----
## 🔗 Related Repositories (E-Commerce Microservices)

All services of this project are part of the same microservices ecosystem:

|--------|------------|--------|
| Auth Service | https://github.com/krishu2814/Auth-Service | ✅ Active |
| Product Service | https://github.com/krishu2814/Product-Service | ✅ Active |
| Cart Service | https://github.com/krishu2814/Cart-Service | ✅ Active |
| Order Service | https://github.com/krishu2814/Order-Service | ✅ Active |

----

## 📊 Payment Schema

```javascript
{
    orderId: String,
    userId: String,
    amount: Number,

    paymentMethod: {
        type: String,
        enum: [
            "CARD",
            "UPI",
            "NET_BANKING",
            "COD"
        ]
    },

    transactionId: String,

    status: {
        type: String,
        enum: [
            "PENDING",
            "SUCCESS",
            "FAILED"
        ]
    }
}
```

---

## ⚙️ Environment Variables

Create a `.env` file inside the root directory.

```env
PORT=5013

MONGO_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/

JWT_SECRET=<your_jwt_secret>

ORDER_SERVICE_URL=http://localhost:5012

CART_SERVICE_URL=http://localhost:5010
```

---

# 📡 API Endpoints

## Process Payment

### Request

```http
POST /api/v1/payments
```

### Body

```json
{
  "orderId": "6854abc123",
  "paymentMethod": "UPI",
  "amount": 1200
}
```

### Response

```json
{
  "_id": "6854xyz123",
  "orderId": "6854abc123",
  "userId": "12345",
  "amount": 1200,
  "paymentMethod": "UPI",
  "status": "SUCCESS",
  "transactionId": "TXN_17501325455"
}
```

---

## Get Payment Details

### Request

```http
GET /api/v1/payments/:paymentId
```

### Response

```json
{
  "_id": "6854xyz123",
  "orderId": "6854abc123",
  "userId": "12345",
  "amount": 1200,
  "paymentMethod": "UPI",
  "status": "SUCCESS",
  "transactionId": "TXN_17501325455"
}
```

---

## 🔗 Inter-Service Communication

### Order Service

#### Get Order

```http
GET /api/v1/orders/:orderId
```

#### Update Order

```http
PATCH /api/v1/orders/:orderId
```

```json
{
  "orderStatus": "PLACED",
  "paymentStatus": "SUCCESS",
  "transactionId": "TXN_123456"
}
```

### Cart Service

#### Clear Cart

```http
DELETE /api/v1/cart/delete/:userId
```

---

## ✅ Validation Rules

### Order Validation

- Order must exist
- Order should not be cancelled
- Order should not already be paid

```javascript
if (
    order.orderStatus === 'CANCELLED' ||
    order.paymentStatus === 'SUCCESS'
) {
    throw new Error('Order cannot be paid');
}
```

### Amount Validation

```javascript
if (
    Number(order.totalAmount) !== Number(amount)
) {
    throw new Error('Amount mismatch');
}
```

### Payment Method Validation

```javascript
const validPaymentMethods =
    Payment.schema.path('paymentMethod').enumValues;
```

This avoids hardcoding and keeps validation synchronized with the database model.

### Duplicate Payment Prevention

```javascript
const existingPayment =
    await paymentRepository.getPaymentByOrderId(orderId);

if (
    existingPayment &&
    existingPayment.status === 'SUCCESS'
) {
    throw new Error('Payment already completed');
}
```

---

## ⚠️ Failure Handling

### Cart Service Failure

Payment remains successful even if cart clearing fails.

```javascript
try {
    await clearCart(userId);
} catch(error) {
    console.error(error.message);
}
```

### Future Enhancements

- RabbitMQ
- Retry Queue
- Dead Letter Queue (DLQ)
- Event Driven Architecture

---

## 🔐 Security

- JWT Authentication
- Protected Routes
- Request Validation
- Amount Verification
- Duplicate Payment Prevention
- Service-Level Validation

---

## 🚀 Future Improvements

### Payment Gateway Integration

- Razorpay
- Stripe
- PayPal

### Event Driven Architecture

- RabbitMQ
- Apache Kafka

### Reliability

- Circuit Breaker Pattern
- Retry Mechanism
- Dead Letter Queue

### Monitoring

- Winston Logger
- Prometheus
- Grafana

### Deployment

- Docker
- Kubernetes
- AWS ECS
- AWS EKS

---

## ▶️ Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/payment-service.git
```

### Move Into Project

```bash
cd payment-service
```

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

### Start Production Server

```bash
npm start
```

---

## 🧪 Example Payment Lifecycle

```text
1. User Places Order

2. Payment Service Fetches Order

3. Amount Validation

4. Payment Record Created

5. Payment Processed

6. Order Updated

7. Cart Cleared

8. Payment Success Response Returned
```

---

## 👨‍💻 Author

### Krishu Kumar

Backend Developer | Microservices Enthusiast

#### Core Skills

- Node.js
- Express.js
- MongoDB
- Mongoose
- Microservices
- REST APIs
- JWT Authentication
- Axios
- Docker
- RabbitMQ
- Go
- Data Structures & Algorithms
- Competitive Programming

---

### ⭐ If you found this project useful, consider giving it a star on GitHub.
