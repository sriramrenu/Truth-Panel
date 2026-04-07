/**
 * Truth Panel - Express API Frontend Fetch Utilities
 * This file provides all the connection logic to link the Next.js frontend pages
 * to our Express.js backend running on localhost:5000.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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

export const createSurvey = async (title: string, description: string, questions: any[], start_time?: string, end_time?: string, points_per_question?: number) => {
    const response = await fetch(`${API_BASE_URL}/surveys`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ title, description, questions, start_time, end_time, points_per_question })
    });
    return response.json();
};

export const fetchAllSurveys = async () => {
    const response = await fetch(`${API_BASE_URL}/surveys`, {
        headers: await getAuthHeaders(),
    });
    return response.json();
};

export const deleteSurveyAPI = async (surveyId: string) => {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}`, {
        method: 'DELETE',
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

export const fetchSurveyAnalytics = async (surveyId: string) => {
    const response = await fetch(`${API_BASE_URL}/responses/survey/${surveyId}`, {
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

export const redeemWalletPoints = async (rewardTitle: string, rewardCost: number) => {
    const response = await fetch(`${API_BASE_URL}/rewards/redeem`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ reward_title: rewardTitle, reward_cost: rewardCost })
    });
    return response.json();
};

export const transferWalletPoints = async (recipient: string, amount: number) => {
    const response = await fetch(`${API_BASE_URL}/rewards/transfer`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ recipient, amount })
    });
    return response.json();
};

/* --- ADMIN RESOURCES --- */

export const fetchEmployees = async () => {
    const response = await fetch(`${API_BASE_URL}/admin/employees`, {
        headers: await getAuthHeaders()
    });
    return response.json();
};

export const createEmployee = async (email: string, password?: string) => {
    const response = await fetch(`${API_BASE_URL}/admin/employee`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ email, password: password || '12345678' })
    });
    return response.json();
};

/* --- AUTHENTICATION & PROFILE --- */

export const loginUser = async (email: string, password?: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return response.json();
};

export const fetchUserProfile = async () => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: await getAuthHeaders()
    });
    return response.json();
};

export const sendOtp = async (email: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    return response.json();
};

export const verifyOtp = async (email: string, otp: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
    });
    return response.json();
};

export const resetPassword = async (email: string, newPassword: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
    });
    return response.json();
};
