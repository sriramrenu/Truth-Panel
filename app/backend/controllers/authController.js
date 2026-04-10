const nodemailer = require('nodemailer');
const supabase = require('../config/supabaseClient');

const otpStore = new Map();

// Configure Brevo Transporter
const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_SERVER || 'smtp-relay.brevo.com',
    port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.BREVO_SMTP_LOGIN,
        pass: process.env.BREVO_SMTP_KEY,
    },
});

const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // 1. Check if user exists in the database
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            console.error('Error checking user existence:', listError);
            return res.status(500).json({ error: 'Internal server error checking user' });
        }

        const user = usersData.users.find(u => u.email === email.trim().toLowerCase());
        if (!user) {
            return res.status(404).json({ success: false, error: "mail doesn't exists" });
        }

        // 2. Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes

        // 3. Store OTP
        otpStore.set(email, { otp, expiresAt });

        // 4. Send Email
        const mailOptions = {
            from: '"Truth Panel" <r.sriramrenu@gmail.com>',
            to: email,
            subject: 'Your Password Reset OTP',
            text: `Your OTP for password reset is ${otp}. It is valid for 2 minutes.`,
            html: `<b>Your OTP for password reset is ${otp}.</b> It is valid for 2 minutes.`
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        return res.status(500).json({ error: 'Failed to send OTP' });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        const storedData = otpStore.get(email);
        if (!storedData) {
            return res.status(400).json({ error: 'OTP not requested or expired' });
        }

        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({ error: 'OTP has expired' });
        }

        if (storedData.otp !== String(otp)) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // OTP valid, remove it
        otpStore.delete(email);

        // In a real app we might return a short-lived reset token here
        return res.status(200).json({ success: true, message: 'OTP verified successfully' });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return res.status(500).json({ error: 'Failed to verify OTP' });
    }
};


const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
            return res.status(400).json({ error: 'Email and new password are required' });
        }

        // In order to update a user's password securely from the backend without their old password or a session,
        // we MUST use the Supabase Admin API which requires the Service Role Key.
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.');
            return res.status(500).json({ error: 'Server misconfiguration: Service Role Key is required for password resets.' });
        }

        // 1. Fetch user by email to get their ID using admin.listUsers
        const { data, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            console.error('Error listing users (check service_role key):', listError);
            return res.status(500).json({ error: 'Failed to access authentication records' });
        }

        const user = data.users.find(u => u.email === email);
        if (!user) {
            return res.status(404).json({ error: 'No user found with this email' });
        }

        // 2. Update the user password securely
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            password: newPassword
        });

        if (updateError) {
            console.error('Error updating password:', updateError);
            return res.status(500).json({ error: 'Failed to update user password in database' });
        }
        
        return res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).json({ error: 'Failed to reset password' });
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return res.status(401).json({ error: error.message });
        
        const userRole = data.user.user_metadata?.role || 'worker';
        const userName = data.user.user_metadata?.name || data.user.email;
        
        res.status(200).json({
            success: true,
            session: data.session,
            user: { email: data.user.email, name: userName, role: userRole }
        });
    } catch (e) { next(e); }
};

const getProfile = (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    const userRole = user.user_metadata?.role || 'worker';
    const userName = user.user_metadata?.name || user.email;
    return res.status(200).json({ 
        success: true, 
        user: { email: user.email, name: userName, role: userRole } 
    });
};

module.exports = {
    sendOTP,
    verifyOTP,
    resetPassword,
    login,
    getProfile
};
