const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const isSurveyExpired = (endTime?: string | null) => {
    if (!endTime) return false;
    const parsed = new Date(endTime).getTime();
    if (Number.isNaN(parsed)) return false;
    return Date.now() > parsed;
};

const getAuthHeaders = async () => {


    const token = typeof window !== 'undefined' ? localStorage.getItem('truth_panel_token') : null;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};


const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    let response = await fetch(url, options);

    if (response.status === 401 && typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('truth_panel_refresh_token');
        if (refreshToken) {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });
            if (refreshRes.ok) {
                const data = await refreshRes.json();
                if (data.session?.access_token) {

                    localStorage.setItem('truth_panel_token', data.session.access_token);

                    const newHeaders = await getAuthHeaders();
                    return fetch(url, { ...options, headers: { ...options.headers, ...newHeaders } });
                }
            }
        }
    }
    return response;
};

/* --- SURVEYS & SESSIONS --- */

export const createSurvey = async (title: string, description: string, questions: any[], start_time?: string, end_time?: string, points_per_question?: number) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/surveys`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ title, description, questions, start_time, end_time, points_per_question })
    });
    return response.json();
};

export const fetchAllSurveys = async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}/surveys`, {
        headers: await getAuthHeaders(),
    });
    return response.json();
};

export const deleteSurveyAPI = async (surveyId: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/surveys/${surveyId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
    });
    return response.json();
};

export const startLiveSession = async (surveyId: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/surveys/session`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ survey_id: surveyId })
    });
    return response.json();
};

export const fetchActiveSession = async (surveyId: string, endTime?: string | null) => {

    if (isSurveyExpired(endTime)) {
        return {
            success: false,
            status: 403,
            message: 'Survey session has expired',
        };
    }

    const response = await fetchWithAuth(`${API_BASE_URL}/surveys/${surveyId}/active-session`, {
        headers: await getAuthHeaders(),
    });

    const payload = await response.json().catch(() => ({}));
    return {
        ...payload,
        status: response.status,
        success: typeof payload?.success === 'boolean' ? payload.success : response.ok,
    };
};

/* --- RESPONSES --- */

export const submitUserResponse = async (sessionId: string, questionId: string, answerValue: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/responses`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ session_id: sessionId, question_id: questionId, answer_value: answerValue })
    });
    return response.json();
};

export const checkUserSubmission = async (sessionId?: string, surveyId?: string) => {
    let url = `${API_BASE_URL}/responses/check/${sessionId}`;
    if (surveyId) {
        url = `${API_BASE_URL}/responses/check-survey?surveyId=${surveyId}`;
    } else if (!sessionId) {
        throw new Error("Either sessionId or surveyId must be provided to check submission.");
    }
    
    const response = await fetchWithAuth(url, {
        headers: await getAuthHeaders(),
    });
    return response.json();
};

/**
 * Notifications API
 */
export const fetchNotifications = async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}/notifications`, {
        headers: await getAuthHeaders(),
    });
    return response.json();
};

export const markNotificationAsRead = async (id: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: await getAuthHeaders(),
    });
    return response.json();
};

export const markAllNotificationsRead = async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: await getAuthHeaders(),
    });
    return response.json();
};

export const fetchSessionAnalytics = async (sessionId: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/responses/${sessionId}`, {
        headers: await getAuthHeaders()
    });
    return response.json();
};

export const fetchSurveyAnalytics = async (surveyId: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/responses/survey/${surveyId}`, {
        headers: await getAuthHeaders()
    });
    return response.json();
};

/* --- REWARDS & WALLET --- */

export const fetchWalletHistory = async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}/rewards/wallet`, {
        headers: await getAuthHeaders()
    });
    return response.json();
};

export const redeemWalletPoints = async (rewardTitle: string, rewardCost: number) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/rewards/redeem`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ reward_title: rewardTitle, reward_cost: rewardCost })
    });
    return response.json();
};

export const transferWalletPoints = async (recipient: string, points: number) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/rewards/transfer`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ recipient, points })
    });
    return response.json();
};

/* --- ADMIN RESOURCES --- */

export const fetchEmployees = async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/employees`, {
        headers: await getAuthHeaders()
    });
    return response.json();
};

export const createEmployee = async (email: string, password?: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/employee`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ email, password: password || '12345678' })
    });
    return response.json();
};

/* --- AUTHENTICATION & PROFILE --- */

export const loginUser = async (email: string, password?: string) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return response.json();
};

export const fetchUserProfile = async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile`, {
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
