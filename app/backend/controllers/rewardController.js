const supabase = require('../config/supabaseClient');

// Allocate points to the user for participating in a survey/session
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

        // 1. Log the reward transaction in the database
        const { error: rewardError } = await supabase
            .from('Rewards')
            .insert([{ 
                user_id: userId, 
                response_id, 
                task_name: 'Survey Response Bonus',
                amount: points,
                transaction_type: 'earn'
            }]);

        if (rewardError) throw rewardError;

        // For this MVP prototype, we sum the 'Rewards' table to calculate real-time wallets.
        // A trigger or cron job can be added later if performance requires denormalization.

        res.status(200).json({ 
            success: true, 
            message: `Successfully earned ${points} points!`, 
            awarded: points 
        });

    } catch (error) {
        next(error);
    }
};

// Get the user's total wallet points and history
const getUserWallet = async (req, res, next) => {
    try {
        const userId = req.user?.id;

        // Fetch all point transactions
        const { data, error } = await supabase
            .from('Rewards')
            .select('amount, transaction_type, task_name, created_at')
            .eq('user_id', userId);

        if (error) throw error;

        // Efficiently sum all points based on transaction type
        const totalPoints = data.reduce((sum, record) => {
            return record.transaction_type === 'spend' 
                ? sum - (record.amount || 0) 
                : sum + (record.amount || 0);
        }, 0);

        res.status(200).json({ 
            success: true, 
            total_points: totalPoints,
            history: data 
        });

    } catch (error) {
        next(error);
    }
};

// Redeem items from catalog
const redeemReward = async (req, res, next) => {
    try {
        const { reward_title, reward_cost } = req.body;
        const userId = req.user?.id;

        const { error } = await supabase.from('Rewards').insert([{
            user_id: userId,
            task_name: `Redeemed: ${reward_title}`,
            amount: reward_cost,
            transaction_type: 'spend'
        }]);
        if (error) throw error;
        
        res.status(200).json({ success: true, message: `Redeemed ${reward_title}` });
    } catch (error) { next(error); }
};

// Transfer points to a colleague
const transferPoints = async (req, res, next) => {
    try {
        const { recipient, amount } = req.body;
        const userId = req.user?.id;

        const { error } = await supabase.from('Rewards').insert([{
            user_id: userId,
            task_name: `Transferred to ${recipient}`,
            amount: amount,
            transaction_type: 'spend'
        }]);
        if (error) throw error;
        
        res.status(200).json({ success: true, message: `Transferred ${amount} points` });
    } catch (error) { next(error); }
};

module.exports = {
    allocatePoints,
    getUserWallet,
    redeemReward,
    transferPoints
};
