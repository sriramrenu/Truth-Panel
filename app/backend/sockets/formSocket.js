const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const redisClient = require('../config/redisClient');
const DbService = require('../config/dbConfig');

let io;

const initSocket = (server) => {
    // 1. Initialize Socket.IO with CORS settings matching Express
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Real-Time Session Invalidation (Pub/Sub)
    const redisSubscriber = redisClient.duplicate();
    redisSubscriber.subscribe('session-revoked');
    redisSubscriber.on('message', (channel, message) => {
        if (channel === 'session-revoked') {
            try {
                const { userId } = JSON.parse(message);
                logger.warn({ msg: 'Session revoked via Pub/Sub, dropping active sockets', userId });
                // Disconnect all sockets belonging to this user
                io.sockets.sockets.forEach((socket) => {
                    if (socket.user && socket.user.id === userId) {
                        socket.emit('error', { message: 'Session Revoked' });
                        socket.disconnect(true);
                    }
                });
            } catch (err) {
                logger.error({ msg: 'Failed to process session-revoked event', error: err.message });
            }
        }
    });

    // 2. JWT Authentication Middleware
    // The client must pass the token during the handshake
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication Error: Missing Token'));
        }

        const secret = process.env.JWT_SECRET || 'dev_secret_only';
        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                return next(new Error('Authentication Error: Invalid or Expired Token'));
            }
            // Attach user data to socket for later use
            socket.user = decoded;
            next();
        });
    });

    // 3. Connection & Room Logic
    io.on('connection', (socket) => {
        logger.info({ msg: 'Socket Connected', socketId: socket.id, user: socket.user.email });

        // User requests to join a specific form room for collaboration
        socket.on('join-form', async ({ surveyId }) => {
            if (!surveyId) return;
            
            try {
                // Enterprise Authorization Check
                const { rows } = await DbService.query(`
                    SELECT 1 FROM public."Surveys" s
                    LEFT JOIN public."Survey_Collaborators" c ON c.survey_id = s.id AND c.user_id = $2
                    WHERE s.id = $1 AND (s.created_by = $2 OR c.user_id IS NOT NULL)
                `, [surveyId, socket.user.id]);

                if (rows.length === 0) {
                    logger.warn({ msg: 'Unauthorized socket room join attempt', user: socket.user.id, surveyId });
                    socket.emit('error', { message: 'Unauthorized to access this form' });
                    return;
                }

                const roomName = `room:${surveyId}`;
                socket.join(roomName);
            socket.activeSurveyId = surveyId; // Store for disconnect handling
            
            // 1. Add user to Redis set for this room
            const presenceKey = `presence:${roomName}`;
            const userState = JSON.stringify({ id: socket.user.id, name: socket.user.name, email: socket.user.email });
            
            await redisClient.sadd(presenceKey, userState);
            // Expire the room presence key after 24h just as a fallback
            await redisClient.expire(presenceKey, 86400);

            // 2. Fetch all active users in the room
            const rawUsers = await redisClient.smembers(presenceKey);
            const activeUsers = rawUsers.map(u => JSON.parse(u));

            // 3. Broadcast the FULL list of active users to the room
            io.to(roomName).emit('presence-update', activeUsers);
            
            logger.info({ msg: 'User Joined Form', user: socket.user.email, room: roomName, activeUsers: activeUsers.length });
            } catch (err) {
                logger.error({ msg: 'Join form authorization error', error: err.message, user: socket.user.id });
                socket.emit('error', { message: 'Failed to authorize room join' });
            }
        });

        // Handle field updates (Phase 4 Concurrency Pipeline)
        socket.on('field-update', async (payload) => {
            const { eventId, surveyId, questionId, field, value, questionVersion } = payload;
            const roomName = `room:${surveyId}`;
            const userId = socket.user.id;

            try {
                // 1. Idempotency Check (Redis)
                const isDuplicate = await redisClient.set(`event:${eventId}`, '1', 'NX', 'EX', 300);
                if (!isDuplicate) {
                    logger.warn({ msg: 'Duplicate event discarded', eventId });
                    return;
                }

                // 2. Rate Limiting (100 ops/min)
                const rateKey = `rate:update:${userId}`;
                const currentOps = await redisClient.incr(rateKey);
                if (currentOps === 1) await redisClient.expire(rateKey, 60);
                if (currentOps > 100) {
                    socket.emit('error', { message: 'Rate limit exceeded' });
                    return;
                }

                // Payload size check (~10MB/min proxy by string length limit here)
                if (JSON.stringify(value).length > 10000000) {
                    socket.emit('error', { message: 'Payload too large' });
                    return;
                }

                // 3. Atomic Validation & DB Transaction
                const client = await DbService.getPool().connect();
                try {
                    await client.query('BEGIN');

                    // Extract the old value for auditing
                    const { rows: oldRows } = await client.query(
                        'SELECT options, question_text, logic FROM "Questions" WHERE id = $1',
                        [questionId]
                    );
                    const oldValue = oldRows.length > 0 ? oldRows[0][field] || null : null;

                    // Optimistic Concurrency Update
                    // Ensure we only update if the client's version matches the DB version
                    const query = `
                        UPDATE public."Questions"
                        SET 
                            ${field} = $1,
                            version = version + 1,
                            updated_at = now(),
                            last_updated_by = $2
                        WHERE id = $3 AND version = $4
                        RETURNING id, version;
                    `;
                    const { rowCount, rows } = await client.query(query, [value, userId, questionId, questionVersion]);

                    if (rowCount === 0) {
                        await client.query('ROLLBACK');
                        logger.warn({ msg: 'Concurrency conflict', questionId, questionVersion });
                        // Emit conflict so frontend can revert optimistic update
                        socket.emit('conflict', { questionId, field, expectedVersion: questionVersion });
                        return;
                    }

                    const newVersion = rows[0].version;

                    // 4. Audit Logging
                    await client.query(`
                        INSERT INTO public."Question_Edit_History" 
                        (event_id, question_id, field, old_value, new_value, edited_by)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [eventId, questionId, field, JSON.stringify(oldValue), JSON.stringify(value), userId]);

                    await client.query('COMMIT');

                    // 5. Broadcast Success to Room
                    logger.info({ msg: 'Field updated atomically', questionId, field, newVersion });
                    socket.to(roomName).emit('form-updated', {
                        questionId,
                        field,
                        value,
                        newVersion
                    });

                } catch (dbErr) {
                    await client.query('ROLLBACK');
                    throw dbErr;
                } finally {
                    client.release();
                }

            } catch (err) {
                logger.error({ msg: 'Socket update error', error: err.message, eventId });
                socket.emit('error', { message: 'Internal Server Error during update' });
            }
        });

        socket.on('disconnect', async () => {
            logger.info({ msg: 'Socket Disconnected', socketId: socket.id, user: socket.user.email });
            
            if (socket.activeSurveyId) {
                const roomName = `room:${socket.activeSurveyId}`;
                const presenceKey = `presence:${roomName}`;
                const userState = JSON.stringify({ id: socket.user.id, name: socket.user.name, email: socket.user.email });
                
                await redisClient.srem(presenceKey, userState);
                const rawUsers = await redisClient.smembers(presenceKey);
                
                io.to(roomName).emit('presence-update', rawUsers.map(u => JSON.parse(u)));
            }
        });
        
        // Custom handler for explicitly leaving a room
        socket.on('leave-form', async ({ surveyId }) => {
            if (!surveyId) return;
            const roomName = `room:${surveyId}`;
            socket.leave(roomName);
            
            const presenceKey = `presence:${roomName}`;
            const userState = JSON.stringify({ id: socket.user.id, name: socket.user.name, email: socket.user.email });
            
            await redisClient.srem(presenceKey, userState);
            
            const rawUsers = await redisClient.smembers(presenceKey);
            const activeUsers = rawUsers.map(u => JSON.parse(u));
            
            io.to(roomName).emit('presence-update', activeUsers);
            logger.info({ msg: 'User Left Form', user: socket.user.email, room: roomName });
        });
    });

    return io;
};

const getIo = () => {
    if (!io) throw new Error('Socket.io not initialized!');
    return io;
};

module.exports = { initSocket, getIo };
