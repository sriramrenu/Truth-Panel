const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const DbService = require('../config/dbConfig');
const logger = require('../utils/logger');
const redisClient = require('../config/redisClient');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_LOGIN,
        pass: process.env.SMTP_KEY,
    },
});

const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const { rows } = await DbService.query('SELECT id FROM "Users" WHERE email = $1 AND deleted_at IS NULL LIMIT 1', [normalizedEmail]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: "mail doesn't exists" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Store OTP in Redis with a 120 second (2 minute) expiration
        await redisClient.set(`otp:${normalizedEmail}`, otp, 'EX', 120);

        const mailOptions = {
            from: `"${process.env.SMTP_FROM_NAME || 'Truth Panel'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_LOGIN}>`,
            to: normalizedEmail,
            subject: 'Your Password Reset OTP',
            text: `Your OTP for password reset is ${otp}. It is valid for 2 minutes.`,
            html: `<b>Your OTP for password reset is ${otp}.</b> It is valid for 2 minutes.`
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to send OTP' });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        
        // Retrieve OTP from Redis
        const storedOtp = await redisClient.get(`otp:${normalizedEmail}`);

        if (!storedOtp) {
            return res.status(400).json({ error: 'OTP not requested or has expired' });
        }

        if (storedOtp !== String(otp)) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // Delete the OTP after successful verification
        await redisClient.del(`otp:${normalizedEmail}`);

        // Generate a secure, single-use reset token valid for 5 minutes
        const resetToken = crypto.randomBytes(32).toString('hex');
        await redisClient.set(`reset_token:${normalizedEmail}`, resetToken, 'EX', 300);

        return res.status(200).json({ 
            success: true, 
            message: 'OTP verified successfully',
            resetToken // Send to frontend for the reset-password request
        });
    } catch (error) {
        logger.error({ msg: 'Verify OTP Error', error: error.message });
        return res.status(500).json({ error: 'Failed to verify OTP' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, newPassword, resetToken } = req.body;
        if (!email || !newPassword || !resetToken) {
            return res.status(400).json({ error: 'Email, new password, and reset token are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Verify the reset token from Redis
        const storedToken = await redisClient.get(`reset_token:${normalizedEmail}`);
        
        if (!storedToken || storedToken !== resetToken) {
            return res.status(403).json({ error: 'Invalid or expired reset session. Please verify OTP again.' });
        }

        const { rows } = await DbService.query('SELECT id FROM "Users" WHERE email = $1 AND deleted_at IS NULL LIMIT 1', [normalizedEmail]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No user found with this email' });
        }

        const saltRounds = 10;
        const password_hash = await bcrypt.hash(newPassword, saltRounds);

        await DbService.query('UPDATE "Users" SET password_hash = $1 WHERE email = $2', [password_hash, normalizedEmail]);
        
        // Consume the reset token so it can't be used again
        await redisClient.del(`reset_token:${normalizedEmail}`);

        return res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        logger.error({ msg: 'Reset Password Error', error: error.message });
        return res.status(500).json({ error: 'Failed to reset password' });
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.trim().toLowerCase();

        const { rows } = await DbService.query('SELECT * FROM "Users" WHERE email = $1 AND deleted_at IS NULL LIMIT 1', [normalizedEmail]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid Email or Password' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid Email or Password' });
        }

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
            throw new Error('CRITICAL: JWT_SECRET missing in production!');
        }
        const secret = JWT_SECRET || 'dev_secret_only';

        // 1. Generate Stateful Refresh Token (Opaque string, not JWT)
        const rawRefreshToken = crypto.randomBytes(40).toString('hex');
        const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
        
        // 7 days from now
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 

        // Insert Session into PostgreSQL
        const sessionResult = await DbService.query(`
            INSERT INTO public."Auth_Sessions" (user_id, refresh_token_hash, device_info, ip_address, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [user.id, refreshTokenHash, req.headers['user-agent'] || 'Unknown', req.ip, expiresAt]);
        
        const sessionId = sessionResult.rows[0].id;

        // 2. Generate Stateless Access Token (JWT)
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name, sessionId },
            secret,
            { expiresIn: '15m' }
        );

        const auditLog = require('../utils/auditLogger');
        await auditLog(req, {
            action: 'login',
            table: 'Users',
            recordId: user.id,
            newData: { email: user.email, role: user.role, sessionId }
        });

        // 3. Send Refresh Token as httpOnly Cookie
        res.cookie('truth_panel_refresh', rawRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(200).json({
            success: true,
            session: { access_token: accessToken },
            user: { email: user.email, name: user.name, role: user.role }
        });
    } catch (e) { next(e); }
};

const getProfile = (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    return res.status(200).json({
        success: true,
        user: { email: user.email, name: user.name, role: user.role }
    });
};

const refreshToken = async (req, res, next) => {
    try {
        // Retrieve token from httpOnly cookie
        const rawRefreshToken = req.cookies?.truth_panel_refresh;
        if (!rawRefreshToken) {
            return res.status(401).json({ error: 'No refresh token provided' });
        }

        const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

        // Verify Session in DB
        const { rows } = await DbService.query(`
            SELECT s.*, u.email, u.role, u.name, u.deleted_at 
            FROM "Auth_Sessions" s
            JOIN "Users" u ON s.user_id = u.id
            WHERE s.refresh_token_hash = $1
        `, [refreshTokenHash]);

        const session = rows[0];

        if (!session) {
            res.clearCookie('truth_panel_refresh');
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        if (session.revoked_at || session.deleted_at || new Date() > new Date(session.expires_at)) {
            res.clearCookie('truth_panel_refresh');
            return res.status(401).json({ error: 'Session expired or revoked' });
        }

        // Token Rotation: Delete old session, create new one
        await DbService.query('DELETE FROM "Auth_Sessions" WHERE id = $1', [session.id]);

        const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
        const newRefreshTokenHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 

        const newSessionResult = await DbService.query(`
            INSERT INTO public."Auth_Sessions" (user_id, refresh_token_hash, device_info, ip_address, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [session.user_id, newRefreshTokenHash, req.headers['user-agent'] || 'Unknown', req.ip, expiresAt]);
        
        const newSessionId = newSessionResult.rows[0].id;

        const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_only';
        const accessToken = jwt.sign(
            { id: session.user_id, email: session.email, role: session.role, name: session.name, sessionId: newSessionId },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.cookie('truth_panel_refresh', newRawRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(200).json({
            success: true,
            session: { access_token: accessToken }
        });
    } catch (e) {
        next(e);
    }
};

const logout = async (req, res, next) => {
    try {
        const rawRefreshToken = req.cookies?.truth_panel_refresh;
        if (rawRefreshToken) {
            const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
            
            // Fetch session to get user_id for pub/sub emit
            const { rows } = await DbService.query('SELECT user_id FROM "Auth_Sessions" WHERE refresh_token_hash = $1', [refreshTokenHash]);
            
            if (rows.length > 0) {
                const userId = rows[0].user_id;
                // Revoke in DB
                await DbService.query('UPDATE "Auth_Sessions" SET revoked_at = now() WHERE refresh_token_hash = $1', [refreshTokenHash]);
                
                // Real-time invalidation: Emit to Redis to kill active sockets across all instances
                redisClient.publish('session-revoked', JSON.stringify({ userId }));
            }
        }
        
        res.clearCookie('truth_panel_refresh');
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (e) {
        next(e);
    }
};

module.exports = {
    sendOTP,
    verifyOTP,
    resetPassword,
    login,
    getProfile,
    refreshToken,
    logout
};
