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
                points_earned: points 
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
            .select('points_earned, created_at')
            .eq('user_id', userId);

        if (error) throw error;

        // Efficiently sum all points 
        const totalPoints = data.reduce((sum, record) => sum + (record.points_earned || 0), 0);

        res.status(200).json({ 
            success: true, 
            total_points: totalPoints,
            history: data 
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    allocatePoints,
    getUserWallet
};
