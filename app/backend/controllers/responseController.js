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

        // Automatically drop Worker Points directly into Wallet hook
        const { data: sessionData, error: sessErr } = await supabase
            .from('Sessions')
            .select('Surveys(title, points_per_question)')
            .eq('id', session_id)
            .single();

        if (!sessErr && sessionData?.Surveys) {
            const points = sessionData.Surveys.points_per_question || 1;
            const surveyTitle = sessionData.Surveys.title || 'Form Submission';

            // Secure backend push to explicit Wallet Rewards infrastructure
            await supabase.from('Rewards').insert([{
                user_id: req.user?.id,
                response_id: responseData.id,
                task_name: `${surveyTitle} (Q)`,
                amount: points,
                transaction_type: 'earn'
            }]);
        }

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

// Fetch all responses belonging to all sessions of a specific survey
const getSurveyResponses = async (req, res, next) => {
    try {
        const { surveyId } = req.params;

        if (!surveyId) {
            return res.status(400).json({ success: false, message: 'Survey ID parameter is required' });
        }

        // 1. Get all session IDs for this survey
        const { data: sessions, error: sessErr } = await supabase
            .from('Sessions')
            .select('id')
            .eq('survey_id', surveyId);

        if (sessErr) throw sessErr;
        
        const sessionIds = sessions.map(s => s.id);

        if (sessionIds.length === 0) {
            return res.status(200).json({ success: true, total_responses: 0, data: [] });
        }

        // 2. Fetch responses tied to these sessions
        const { data, error } = await supabase
            .from('Responses')
            .select('*, Questions(question_text)')
            .in('session_id', sessionIds);

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
    checkUserSubmission,
    getSurveyResponses
};
