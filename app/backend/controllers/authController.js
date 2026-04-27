const nodemailer = require('nodemailer');
const DbService = require('../config/dbConfig');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const otpStore = new Map();
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
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
        const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes
        otpStore.set(normalizedEmail, { otp, expiresAt });
        const mailOptions = {
            from: '"Truth Panel" <r.sriramrenu@gmail.com>',
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
        const storedData = otpStore.get(normalizedEmail);
        
        if (!storedData) {
            return res.status(400).json({ error: 'OTP not requested or expired' });
        }

        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(normalizedEmail);
            return res.status(400).json({ error: 'OTP has expired' });
        }

        if (storedData.otp !== String(otp)) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }
        otpStore.delete(normalizedEmail);

        return res.status(200).json({ success: true, message: 'OTP verified successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to verify OTP' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
            return res.status(400).json({ error: 'Email and new password are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const { rows } = await DbService.query('SELECT id FROM "Users" WHERE email = $1 AND deleted_at IS NULL LIMIT 1', [normalizedEmail]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No user found with this email' });
        }

        const saltRounds = 10;
        const password_hash = await bcrypt.hash(newPassword, saltRounds);
        await DbService.query('UPDATE "Users" SET password_hash = $1 WHERE email = $2', [password_hash, normalizedEmail]);
        
        return res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
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

        const JWT_SECRET = process.env.JWT_SECRET || 'you_should_set_a_jwt_secret_in_env_file';
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name }, 
            JWT_SECRET, 
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { id: user.id }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );
        
        res.status(200).json({
            success: true,
            session: { 
                access_token: accessToken,
                refresh_token: refreshToken
            },
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
        const { refresh_token } = req.body;
        if (!refresh_token) {
            return res.status(401).json({ error: 'Refresh token is required' });
        }

        const JWT_SECRET = process.env.JWT_SECRET || 'you_should_set_a_jwt_secret_in_env_file';
        
        jwt.verify(refresh_token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ error: 'Invalid or expired refresh token' });
            }

            const { rows } = await DbService.query('SELECT * FROM "Users" WHERE id = $1 AND deleted_at IS NULL LIMIT 1', [decoded.id]);
            const user = rows[0];
            if (!user) {
                return res.status(401).json({ error: 'User no longer exists' });
            }

            const accessToken = jwt.sign(
                { id: user.id, email: user.email, role: user.role, name: user.name }, 
                JWT_SECRET, 
                { expiresIn: '15m' }
            );

            res.status(200).json({
                success: true,
                session: { access_token: accessToken }
            });
        });
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
    refreshToken
};
