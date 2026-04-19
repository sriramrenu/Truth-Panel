const DbService = require('../config/dbConfig');
const { notifyAllWorkers, createNotification } = require('../controllers/notificationController');

/**
 * Service to handle periodic notification checks (Ending Soon, Expired)
 */
const runMaintenance = async () => {
    try {
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

        // 1. Check for surveys ending in ~1 hour (that haven't notified yet)
        const { rows: endingSoon } = await DbService.query(`
            SELECT s.id, s.title, s.end_time 
            FROM "Surveys" s
            JOIN "Sessions" sess ON s.id = sess.survey_id
            WHERE s.end_time > $1 AND s.end_time <= $2
            AND sess.status = 'active'
            AND NOT EXISTS (
                SELECT 1 FROM "Notifications" n 
                WHERE n.related_id = s.id AND n.type = 'ending_soon'
            )
        `, [now, oneHourFromNow]);

        for (const survey of endingSoon) {
            // Only notify workers who haven't submitted yet
            const { rows: pendingWorkers } = await DbService.query(`
                SELECT u.id FROM "Users" u
                WHERE u.role = 'worker'
                AND NOT EXISTS (
                    SELECT 1 FROM "Responses" r
                    JOIN "Sessions" sess ON r.session_id = sess.id
                    WHERE r.user_id = u.id AND sess.survey_id = $1
                )
            `, [survey.id]);

            for (const worker of pendingWorkers) {
                await createNotification(
                    worker.id,
                    'Ending Soon!',
                    `"${survey.title}" expires in less than an hour. Don't miss out!`,
                    'ending_soon',
                    survey.id
                );
            }
        }

        // 2. Check for surveys that expired in the last 15 minutes
        const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
        const { rows: justExpired } = await DbService.query(`
            SELECT s.id, s.title, sess.started_by 
            FROM "Surveys" s
            JOIN "Sessions" sess ON s.id = sess.survey_id
            WHERE s.end_time > $1 AND s.end_time <= $2
            AND NOT EXISTS (
                SELECT 1 FROM "Notifications" n 
                WHERE n.related_id = s.id AND n.type = 'expired'
            )
        `, [fifteenMinsAgo, now]);

        for (const survey of justExpired) {
            // Notify Workers
            const { rows: missingWorkers } = await DbService.query(`
                SELECT u.id FROM "Users" u
                WHERE u.role = 'worker'
                AND NOT EXISTS (
                    SELECT 1 FROM "Responses" r
                    JOIN "Sessions" sess ON r.session_id = sess.id
                    WHERE r.user_id = u.id AND sess.survey_id = $1
                )
            `, [survey.id]);

            for (const worker of missingWorkers) {
                await createNotification(
                    worker.id,
                    'Survey Expired',
                    `You missed the window for "${survey.title}". Keep an eye out for future surveys!`,
                    'expired',
                    survey.id
                );
            }

            // Notify Admin
            if (survey.started_by) {
                const { rows: participants } = await DbService.query(`
                    SELECT COUNT(DISTINCT user_id) FROM "Responses" 
                    WHERE session_id IN (SELECT id FROM "Sessions" WHERE survey_id = $1)
                `, [survey.id]);
                
                await createNotification(
                    survey.started_by,
                    'Survey Ended',
                    `"${survey.title}" has officially ended. Final participation: ${participants[0].count} workers.`,
                    'survey_ended',
                    survey.id
                );
            }
        }

    } catch (error) {
        console.error('Notification Maintenance Error:', error);
    }
};

// Start the maintenance loop
const startMaintenance = (intervalMs = 5 * 60 * 1000) => {
    console.log(`Notification Maintenance Service started (Interval: ${intervalMs}ms)`);
    // Run once immediately
    runMaintenance();
    // Then periodically
    setInterval(runMaintenance, intervalMs);
};

module.exports = { startMaintenance };
