const { z } = require('zod');

/**
 * Enterprise Schema Definitions
 * Centrally managed for consistent validation across all TATA endpoints.
 */

// Common UUID schema
const uuidSchema = z.string().uuid();

// Authentication Schemas
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
});

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    department: z.string().optional()
});

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
    question_id: uuidSchema,
    answer_value: z.union([z.string(), z.number()])
});

module.exports = {
    loginSchema,
    registerSchema,
    createSurveySchema,
    submissionSchema,
    uuidSchema
};
