const jwt = require('jsonwebtoken');

/**
 * Express middleware to verify custom JWT tokens.
 * Expects the 'Authorization: Bearer <TOKEN>' header.
 */
const verifyAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized: Missing or invalid authentication token.' 
            });
        }

        const token = authHeader.split(' ')[1];
        const JWT_SECRET = process.env.JWT_SECRET;
        
        if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
            throw new Error('CRITICAL: JWT_SECRET must be set in production!');
        }

        const secret = JWT_SECRET || 'dev_secret_only';
        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                logger.error({ msg: 'JWT Validation Failure', error: err.message });
                return res.status(401).json({ 
                    success: false, 
                    message: 'Unauthorized: Token failed validation.' 
                });
            }
            req.user = decoded;
            next();
        });

    } catch (err) {
        console.error('Authentication Middleware Exception:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error during authentication.' 
        });
    }
};

module.exports = { verifyAuth };
