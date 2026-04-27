const DbService = require('../config/dbConfig');
const bcrypt = require('bcrypt');

/**
 * Fetches all non-admin users, including their new profile fields.
 */
const getEmployees = async (req, res, next) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required.' });
        }

        const { rows } = await DbService.query('SELECT id, email, name, role, phone_number, department FROM "Users" WHERE role != $1 AND deleted_at IS NULL', ['admin']);
        
        const workers = rows.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name || 'Worker',
            role: u.role || 'worker',
            phone: u.phone_number,
            department: u.department
        }));
            
        res.status(200).json({ success: true, count: workers.length, employees: workers });
    } catch (error) {
        next(error);
    }
};

/**
 * Creates a new employee account with support for phone and department.
 */
const createEmployee = async (req, res, next) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required.' });
        }

        const { email, password, name, phone, department, role } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        const normalizedEmail = email.trim().toLowerCase();
        
        const checkRes = await DbService.query('SELECT id FROM "Users" WHERE email = $1 LIMIT 1', [normalizedEmail]);
        if (checkRes.rows.length > 0) {
            return res.status(400).json({ error: 'Employee with this email already exists' });
        }

        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        await DbService.query(`
            INSERT INTO "Users" (email, password_hash, name, role, phone_number, department)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            normalizedEmail, 
            password_hash, 
            name || email.split('@')[0], 
            role || 'worker',
            phone || null,
            department || null
        ]);
        
        res.status(201).json({ success: true, message: 'Employee created successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getEmployees,
    createEmployee
};
