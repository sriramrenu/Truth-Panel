const supabase = require('../config/supabaseClient');

// Create a new Survey template (Admin)
const createSurvey = async (req, res, next) => {
    try {
        const { title, description, questions } = req.body;
        
        if (!title || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: 'Invalid payload: title and questions array required' });
        }

        // 1. Insert the Survey
        const { data: surveyData, error: surveyError } = await supabase
            .from('Surveys')
            .insert([{ title, description, created_by: req.user?.id }])
            .select()
            .single();
            
        if (surveyError) throw surveyError;

        // 2. Insert Questions if payload contains any
        if (questions.length > 0) {
            const formattedQuestions = questions.map(q => ({
                survey_id: surveyData.id,
                question_text: q.question_text,
                question_type: q.question_type || 'MCQ',
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
            .select('*, Questions(*)');

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

module.exports = {
    createSurvey,
    getAllSurveys,
    createSession
};
