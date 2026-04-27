const DbService = require('../config/dbConfig');

/**
 * Manually allocates points (earnings) to a user's wallet.
 */
const allocatePoints = async (req, res, next) => {
    try {
        const { session_id, submission_id, description, points } = req.body;
        const userId = req.user?.id;

        if (points === undefined || points <= 0) {
            return res.status(400).json({ success: false, message: 'Points must be a positive integer' });
        }

        const { rows } = await DbService.query(`
            INSERT INTO "Transactions" (user_id, submission_id, amount, type, description)
            VALUES ($1, $2, $3, 'earn', $4)
            RETURNING balance_after
        `, [userId, submission_id || null, points, description || 'Manual allocation']);

        res.status(200).json({ 
            success: true, 
            message: `Successfully earned ${points} Neu Coins!`, 
            new_balance: rows[0].balance_after 
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Fetches the user's current wallet balance and transaction history.
 */
const getUserWallet = async (req, res, next) => {
    try {
        const userId = req.user?.id;

        const { rows: history } = await DbService.query(`
            SELECT id, amount, type, balance_after, description, created_at 
            FROM "Transactions" 
            WHERE user_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC, id DESC
        `, [userId]);

        const currentBalance = history.length > 0 ? history[0].balance_after : 0;

        res.status(200).json({ 
            success: true, 
            total_points: currentBalance,
            history: history 
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Deducts points for a reward redemption.
 */
const redeemReward = async (req, res, next) => {
    try {
        const { reward_title, reward_cost } = req.body;
        const userId = req.user?.id;

        const { rows } = await DbService.query(`
            INSERT INTO "Transactions" (user_id, amount, type, description)
            VALUES ($1, $2, 'spend', $3)
            RETURNING balance_after
        `, [userId, reward_cost, `Redeemed: ${reward_title}`]);
        
        const auditLog = require('../utils/auditLogger');
        await auditLog(req, {
            action: 'redeem',
            table: 'Transactions',
            recordId: userId, // Mapping to user for wallet history
            newData: { reward_title, reward_cost, new_balance: rows[0].balance_after }
        });
        
        res.status(200).json({ success: true, message: `Redeemed ${reward_title}`, new_balance: rows[0].balance_after });
    } catch (error) {
        next(error);
    }
};

/**
 * Transfers points between users.
 */
const transferPoints = async (req, res, next) => {
    try {
        const { recipient_email, points } = req.body;
        const userId = req.user?.id;

        // Find recipient
        const recipientRes = await DbService.query('SELECT id FROM "Users" WHERE email = $1 AND deleted_at IS NULL', [recipient_email]);
        if (recipientRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Recipient not found' });
        const recipientId = recipientRes.rows[0].id;

        // Perform both transactions (debit sender, credit recipient)
        // Ideally wrapped in a single DB transaction
        await DbService.query('BEGIN');
        try {
            await DbService.query(`
                INSERT INTO "Transactions" (user_id, amount, type, description)
                VALUES ($1, $2, 'spend', $3)
            `, [userId, points, `Transfer to ${recipient_email}`]);

            await DbService.query(`
                INSERT INTO "Transactions" (user_id, amount, type, description)
                VALUES ($1, $2, 'earn', $3)
            `, [recipientId, points, `Transfer from user`]);

            const auditLog = require('../utils/auditLogger');
            await auditLog(req, {
                action: 'transfer',
                table: 'Transactions',
                recordId: userId,
                newData: { recipient_email, points }
            });

            await DbService.query('COMMIT');
            res.status(200).json({ success: true, message: `Transferred ${points} points to ${recipient_email}` });
        } catch (err) {
            await DbService.query('ROLLBACK');
            throw err;
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    allocatePoints,
    getUserWallet,
    redeemReward,
    transferPoints
};
