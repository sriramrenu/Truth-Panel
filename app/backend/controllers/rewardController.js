const DbService = require('../config/dbConfig');
const allocatePoints = async (req, res, next) => {
    try {
        const { response_id, points } = req.body;
        const userId = req.user?.id;

        if (!response_id || points === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid payload: response_id and points required' 
            });
        }
        await DbService.query(`
            INSERT INTO "Rewards" (user_id, response_id, task_name, amount, transaction_type)
            VALUES ($1, $2, $3, $4, $5)
        `, [userId, response_id, 'Survey Response Bonus', points, 'earn']);

        res.status(200).json({ 
            success: true, 
            message: `Successfully earned ${points} points!`, 
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
            SELECT amount, transaction_type, task_name, created_at 
            FROM "Rewards" WHERE user_id = $1
        `, [userId]);
        const totalPoints = rows.reduce((sum, record) => {
            return record.transaction_type === 'spend' 
                ? sum - (record.amount || 0) 
                : sum + (record.amount || 0);
        }, 0);

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
            INSERT INTO "Rewards" (user_id, task_name, amount, transaction_type)
            VALUES ($1, $2, $3, $4)
        `, [userId, `Redeemed: ${reward_title}`, reward_cost, 'spend']);
        
        res.status(200).json({ success: true, message: `Redeemed ${reward_title}` });
    } catch (error) { next(error); }
};
const transferPoints = async (req, res, next) => {
    try {
        const { recipient, amount } = req.body;
        const userId = req.user?.id;

        await DbService.query(`
            INSERT INTO "Rewards" (user_id, task_name, amount, transaction_type)
            VALUES ($1, $2, $3, $4)
        `, [userId, `Transferred to ${recipient}`, amount, 'spend']);
        
        res.status(200).json({ success: true, message: `Transferred ${amount} points` });
    } catch (error) { next(error); }
};

module.exports = {
    allocatePoints,
    getUserWallet,
    redeemReward,
    transferPoints
};
