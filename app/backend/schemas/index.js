const { z } = require('zod');

/**
 * Enterprise Schema Definitions
 * Centrally managed for consistent validation across all TATA endpoints.
 */

// Common UUID schema
const uuidSchema = z.string().uuid();

// Authentication Schemas
const loginSchema = {
    body: z.object({
        email: z.string().email(),
        password: z.string().min(8)
    })
};

const registerSchema = {
    body: z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(2).optional(),
        phone: z.string().optional(),
        department: z.string().optional()
    })
};

const sendOTPSchema = {
    body: z.object({
        email: z.string().email()
    })
};

const verifyOTPSchema = {
    body: z.object({
        email: z.string().email(),
        otp: z.string().length(6)
    })
};

const resetPasswordSchema = {
    body: z.object({
        email: z.string().email(),
        newPassword: z.string().min(8),
        resetToken: z.string().min(10)
    })
};

// Survey Schemas
const createSurveySchema = z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    questions: z.array(z.object({
        question_text: z.string().min(1),
        question_type: z.enum(['text', 'multiple_choice', 'rating']),
        options: z.any().optional()
    })).min(1),
    points_per_question: z.number().int().positive().default(1)
});

// Submission Schemas
const submissionSchema = z.object({
    session_id: uuidSchema,
    answers: z.array(z.object({
        question_id: uuidSchema,
        answer: z.union([z.string(), z.number()])
    })).min(1)
});

module.exports = {
    loginSchema,
    registerSchema,
    sendOTPSchema,
    verifyOTPSchema,
    resetPasswordSchema,
    createSurveySchema,
    submissionSchema,
    uuidSchema
};
