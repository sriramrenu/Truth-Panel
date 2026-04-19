const DbService = require('../config/dbConfig');

/**
 * Fetch all notifications for the authenticated user.
 */
const getUserNotifications = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { rows } = await DbService.query(`
            SELECT * FROM "Notifications" 
            WHERE user_id = $1::uuid 
            ORDER BY created_at DESC
        `, [userId]);

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark a single notification as read.
 */
const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        await DbService.query(`
            UPDATE "Notifications" SET is_read = true 
            WHERE id = $1::uuid AND user_id = $2::uuid
        `, [id, userId]);

        res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark all notifications as read for the user.
 */
const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        await DbService.query(`
            UPDATE "Notifications" SET is_read = true 
            WHERE user_id = $1::uuid
        `, [userId]);

        res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        next(error);
    }
};

/**
 * Internal helper to create a notification for a user.
 */
const createNotification = async (userId, title, message, type, relatedId = null) => {
    try {
        await DbService.query(`
            INSERT INTO "Notifications" (user_id, title, message, type, related_id)
            VALUES ($1::uuid, $2, $3, $4, $5)
        `, [userId, title, message, type, relatedId]);
        return true;
    } catch (error) {
        console.error('Failed to create notification:', error);
        return false;
    }
};

/**
 * Internal helper to notify all workers about something.
 */
const notifyAllWorkers = async (title, message, type, relatedId = null) => {
    try {
        // Fetch all users with role 'worker'
        const { rows: workers } = await DbService.query('SELECT id FROM "Users" WHERE role = $1', ['worker']);
        
        for (const worker of workers) {
            await createNotification(worker.id, title, message, type, relatedId);
        }
        return true;
    } catch (error) {
        console.error('Failed to notify all workers:', error);
        return false;
    }
};

module.exports = {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
    notifyAllWorkers
};
