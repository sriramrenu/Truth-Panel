const supabase = require('../config/supabaseClient');

// Submit an employee's response to a specific question inside an active session
const submitResponse = async (req, res, next) => {
    try {
        const { session_id, question_id, answer_value } = req.body;
        
        if (!session_id || !question_id || answer_value === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid payload: session_id, question_id, and answer_value are required' 
            });
        }

        // Insert the Response into the database
        const { data: responseData, error: responseError } = await supabase
            .from('Responses')
            .insert([{ 
                session_id, 
                question_id, 
                user_id: req.user?.id, 
                answer: String(answer_value) 
            }])
            .select()
            .single();
            
        if (responseError) throw responseError;

        // Note: Real-time update to dashboards happens automatically if Supabase Realtime 
        // is enabled on the 'Responses' table.
        // We will trigger the Wallet reward points update logic from here later.

        res.status(201).json({ success: true, message: 'Response submitted successfully', data: responseData });

    } catch (error) {
        next(error);
    }
};

// Fetch aggregated responses for a specific session (Admin analytics view)
const getSessionResponses = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'Session ID parameter is required' });
        }

        // Fetches all responses tied to the session.
        // Also retrieves the nested Question text to make the frontend ReCharts rendering seamless!
        const { data, error } = await supabase
            .from('Responses')
            .select('*, Questions(question_text)')
            .eq('session_id', sessionId);

        if (error) throw error;

        res.status(200).json({ success: true, total_responses: data.length, data });

    } catch (error) {
        next(error);
    }
};

// Check if the current user has already submitted to a specific session
const checkUserSubmission = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user?.id;

        if (!sessionId || !userId) {
            return res.status(400).json({ success: false, message: 'session_id and auth token required' });
        }

        const { data, error } = await supabase
            .from('Responses')
            .select('id')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .limit(1);

        if (error) throw error;

        res.status(200).json({ success: true, already_submitted: data.length > 0 });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    submitResponse,
    getSessionResponses,
    checkUserSubmission
};
