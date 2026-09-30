const express = require('express');
const { PORT } = require('./config/serverConfig');
const connectDB = require('./config/database');
const apiRoutes = require('./routes/index');
const { connectRabbitMQ } = require('./config/rabbitmq');

const app = express();

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(require('./middleware/correlation-middleware'));

app.use('/api', apiRoutes);

// Error Handling Middleware
app.use(require('./middleware/not-found-handler'));
app.use(require('./middleware/error-handler'));

const setUpAndStartServer = async () => {

    await connectDB();

    await connectRabbitMQ();

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

setUpAndStartServer();
