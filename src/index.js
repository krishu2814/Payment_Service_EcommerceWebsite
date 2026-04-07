const express = require('express');
const { PORT } = require('./config/serverConfig');
const connectDB = require('./config/database');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const setUpAndStartServer = async () => {
    
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

setUpAndStartServer();
