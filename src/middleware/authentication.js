const JWT = require('jsonwebtoken');
const { SECRET_TOKEN } = require('../config/serverConfig');

const AuthenticUser = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Authorization header is missing'
            });
        }

        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is missing'
            });
        }

        const decoded = JWT.verify(token, SECRET_TOKEN);
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid access token'
            });
        }

        req.user = {
            id: decoded.id || decoded.userId || decoded._id,
            userId: decoded.id || decoded.userId || decoded._id,
            _id: decoded.id || decoded.userId || decoded._id,
            email: decoded.email,
            role: decoded.role
        };
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired access token',
            error: error.message
        });
    }
};

module.exports = AuthenticUser;
