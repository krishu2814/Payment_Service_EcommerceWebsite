const JWT = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/serverConfig');

const AuthenticUser = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token is missing' });
    }
    
    const decoded = JWT.verify(token, JWT_SECRET);
    if (!decoded) {
        return res.status(403).json({ message: 'Invalid access token' });
    }

    req.user = decoded; // Attach user info to request object -> to get userid
    next();
};

module.exports = AuthenticUser;
