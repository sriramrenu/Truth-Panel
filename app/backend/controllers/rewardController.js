const DbService = require('../config/dbConfig');

const allocatePoints = async (req, res, next) => {
    try {
        const { session_id, session_name, points } = req.body;
        const userId = req.user?.id;

        if (!session_id || points === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid payload: session_id and points required' 
            });
        }
        await DbService.query(`
            INSERT INTO "Rewards" (user_id, session_id, session_name, points, updated_by)
            VALUES ($1, $2, $3, $4, $1)
        `, [userId, session_id, session_name || 'Survey Session', points]);

        res.status(200).json({ 
            success: true, 
            message: `Successfully earned ${points} Neu Coins!`, 
            awarded: points 
        });

    } catch (error) {
        next(error);
    }
};

const getUserWallet = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { rows } = await DbService.query(`
            SELECT points, session_name, updated_at 
            FROM "Rewards" 
            WHERE user_id = $1 AND deleted_at IS NULL
        `, [userId]);

        const totalPoints = rows.reduce((sum, record) => sum + (record.points || 0), 0);

        res.status(200).json({ 
            success: true, 
            total_points: totalPoints,
            history: rows 
        });

    } catch (error) {
        next(error);
    }
};

const redeemReward = async (req, res, next) => {
    try {
        const { reward_title, reward_cost } = req.body;
        const userId = req.user?.id;

        await DbService.query(`
            INSERT INTO "Rewards" (user_id, session_name, points, updated_by)
            VALUES ($1, $2, $3, $1)
        `, [userId, `Redeemed: ${reward_title}`, -reward_cost]);
        
        res.status(200).json({ success: true, message: `Redeemed ${reward_title}` });
    } catch (error) { next(error); }
};

const transferPoints = async (req, res, next) => {
    try {
        const { recipient, points } = req.body;
        const userId = req.user?.id;

        await DbService.query(`
            INSERT INTO "Rewards" (user_id, session_name, points, updated_by)
            VALUES ($1, $2, $3, $1)
        `, [userId, `Transferred to ${recipient}`, -points]);
        
        res.status(200).json({ success: true, message: `Transferred ${points} points` });
    } catch (error) { next(error); }
};

module.exports = {
    allocatePoints,
    getUserWallet,
    redeemReward,
    transferPoints
};
