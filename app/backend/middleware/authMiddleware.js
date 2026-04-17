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
        const JWT_SECRET = process.env.JWT_SECRET || 'you_should_set_a_jwt_secret_in_env_file';
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error('JWT Validation Error:', err.message);
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
