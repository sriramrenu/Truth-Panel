const supabase = require('../config/supabaseClient');

// Create a new Survey template (Admin)
const createSurvey = async (req, res, next) => {
    try {
        const { title, description, questions, start_time, end_time, points_per_question } = req.body;
        
        if (!title || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: 'Invalid payload: title and questions array required' });
        }

        // 1. Insert the Survey
        const { data: surveyData, error: surveyError } = await supabase
            .from('Surveys')
            .insert([{ 
                title, 
                description,
                start_time: start_time || null,
                end_time: end_time || null,
                points_per_question: points_per_question || 1,
                created_by: req.user?.id 
            }])
            .select()
            .single();
            
        if (surveyError) throw surveyError;

        // 2. Insert Questions if payload contains any
        if (questions.length > 0) {
            const formattedQuestions = questions.map(q => ({
                survey_id: surveyData.id,
                question_text: q.questionText || q.question_text,
                question_type: q.type || q.question_type || 'MCQ',
                options: q.options || [] // Expecting JSON array for MCQ choices
            }));

            const { error: questionsError } = await supabase
                .from('Questions')
                .insert(formattedQuestions);

            if (questionsError) throw questionsError;
        }

        res.status(201).json({ success: true, message: 'Survey created successfully', survey: surveyData });

    } catch (error) {
        next(error);
    }
};

// Fetch all Surveys with their attached questions
const getAllSurveys = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('Surveys')
            .select('*, Questions(*), Sessions(Responses(user_id))');

        if (error) throw error;

        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// Create a Live Session for a specific Survey
const createSession = async (req, res, next) => {
    try {
        const { survey_id } = req.body;
        
        // Generate a random 4 digit PIN for employees to join the session
        const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString(); 

        const { data, error } = await supabase
            .from('Sessions')
            .insert([{ 
                survey_id, 
                pin_code: generatePin(), 
                status: 'active',
                started_by: req.user?.id 
            }])
            .select()
            .single();

        if (error) throw error;
        
        res.status(201).json({ success: true, message: 'Session started successfully! Please share the PIN with employees.', session: data });
    } catch (error) {
        next(error);
    }
};

// Fetch the currently active Session for a given Survey (for Workers)
const getActiveSession = async (req, res, next) => {
    try {
        const { survey_id } = req.params;
        
        // 1. Ensure Survey hasn't expired
        const { data: survey, error: surveyError } = await supabase
            .from('Surveys')
            .select('end_time')
            .eq('id', survey_id)
            .single();
            
        if (!surveyError && survey?.end_time) {
            const now = new Date();
            const endTime = new Date(survey.end_time);
            if (now > endTime) {
                return res.status(403).json({ success: false, message: 'Survey session has expired' });
            }
        }

        const { data, error } = await supabase
            .from('Sessions')
            .select('*')
            .eq('survey_id', survey_id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) throw error;
        res.status(200).json({ success: true, session: data });
    } catch (error) {
        next(error);
    }
};

// Delete a Survey template cleanly natively
const deleteSurvey = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: 'Survey ID parameter is required' });
        }
        
        // Native DB delete. Cascade wipes Questions automatically.
        const { error } = await supabase.from('Surveys').delete().eq('id', id);

        if (error) throw error;
        
        res.status(200).json({ success: true, message: 'Survey deleted seamlessly' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSurvey,
    getAllSurveys,
    createSession,
    getActiveSession,
    deleteSurvey
};
