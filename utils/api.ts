/**
 * Truth Panel - Express API Frontend Fetch Utilities
 * This file provides all the connection logic to link the Next.js frontend pages
 * to our Express.js backend running on localhost:5000.
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Utility to grab the user's JWT standardly for requests
const getAuthHeaders = async () => {
    // Note: Assuming your frontend sets truth_panel_token or uses Supabase cookies natively.
    // The exact token retrieval depends on your final Auth setup in the frontend team.
    const token = typeof window !== 'undefined' ? localStorage.getItem('supabase_token') : '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

/* --- SURVEYS & SESSIONS --- */

export const createSurvey = async (title: string, description: string, questions: any[]) => {
    const response = await fetch(`${API_BASE_URL}/surveys`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ title, description, questions })
    });
    return response.json();
};

export const fetchAllSurveys = async () => {
    const response = await fetch(`${API_BASE_URL}/surveys`, {
        headers: await getAuthHeaders(),
    });
    return response.json();
};

export const startLiveSession = async (surveyId: string) => {
    const response = await fetch(`${API_BASE_URL}/surveys/session`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ survey_id: surveyId })
    });
    return response.json();
};

export const fetchActiveSession = async (surveyId: string) => {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/active-session`, {
        headers: await getAuthHeaders(),
    });
    return response.json();
};

/* --- RESPONSES --- */

export const submitUserResponse = async (sessionId: string, questionId: string, answerValue: string) => {
    const response = await fetch(`${API_BASE_URL}/responses`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ session_id: sessionId, question_id: questionId, answer_value: answerValue })
    });
    return response.json();
};

export const checkUserSubmission = async (sessionId: string) => {
    const response = await fetch(`${API_BASE_URL}/responses/check/${sessionId}`, {
        headers: await getAuthHeaders(),
    });
    return response.json();
};

export const fetchSessionAnalytics = async (sessionId: string) => {
    const response = await fetch(`${API_BASE_URL}/responses/${sessionId}`, {
        headers: await getAuthHeaders()
    });
    return response.json();
};

/* --- REWARDS & WALLET --- */

export const fetchWalletHistory = async () => {
    const response = await fetch(`${API_BASE_URL}/rewards/wallet`, {
        headers: await getAuthHeaders()
    });
    return response.json();
};
