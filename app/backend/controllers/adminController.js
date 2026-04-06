const supabase = require('../config/supabaseClient');

const getEmployees = async (req, res, next) => {
    try {
        // Enforce admin privileges if strictly needed, but verifyAuth handles JWT. 
        // For security in production, we should assert req.user.user_metadata.role === 'admin'
        if (req.user?.user_metadata?.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required.' });
        }

        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;
        
        const workers = data.users
            .filter(u => u.user_metadata?.role === 'worker' || !u.user_metadata?.role)
            .map(u => ({
                id: u.id,
                email: u.email,
                name: u.user_metadata?.name || 'Worker',
                role: u.user_metadata?.role || 'worker'
            }));
            
        res.status(200).json({ success: true, count: workers.length, employees: workers });
    } catch (error) {
        next(error);
    }
};

const createEmployee = async (req, res, next) => {
    try {
        if (req.user?.user_metadata?.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required.' });
        }

        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'worker', name: email.split('@')[0] }
        });
        
        if (error) throw error;
        
        res.status(201).json({ success: true, message: 'Employee created successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getEmployees,
    createEmployee
};
