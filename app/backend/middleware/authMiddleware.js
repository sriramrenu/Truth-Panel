const supabase = require('../config/supabaseClient');

/**
 * Express middleware to verify JWT tokens from Supabase Auth.
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

        // Validates token against Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('Supabase Auth Validation Error:', error?.message);
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized: Token failed validation.' 
            });
        }

        // Attach user info to request context for downstream controllers
        req.user = user;
        next();
    } catch (err) {
        console.error('Authentication Middleware Exception:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error during authentication.' 
        });
    }
};

module.exports = { verifyAuth };
