-- TRUTH PANEL - SUPABASE NATIVE CUSOM AUTH SQL SCHEMA
-- Run these commands in your Supabase SQL Editor.
-- WARNING: This will drop your existing data because of FK constraints changing!

-- Enable UUID extension just in case
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables sequentially to cleanly wipe old Foreign Keys
DROP TABLE IF EXISTS public."Rewards" CASCADE;
DROP TABLE IF EXISTS public."Responses" CASCADE;
DROP TABLE IF EXISTS public."Sessions" CASCADE;
DROP TABLE IF EXISTS public."Questions" CASCADE;
DROP TABLE IF EXISTS public."Surveys" CASCADE;
DROP TABLE IF EXISTS public."Users" CASCADE;

-- 0. Custom Users Table (Replaces Supabase Auth)
CREATE TABLE public."Users" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'worker' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1. Surveys Table
CREATE TABLE public."Surveys" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public."Users"(id), -- Formerly auth.users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    points_per_question INTEGER DEFAULT 1 NOT NULL
);

-- 2. Questions Table
CREATE TABLE public."Questions" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    survey_id UUID REFERENCES public."Surveys"(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'MCQ' NOT NULL, -- e.g., 'MCQ', 'TEXT', 'SCALE'
    options JSONB DEFAULT '[]'::jsonb, -- Store choices as a JSON array
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Sessions (Active Live Sessions)
CREATE TABLE public."Sessions" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    survey_id UUID REFERENCES public."Surveys"(id) ON DELETE CASCADE NOT NULL,
    pin_code TEXT NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL, -- 'active', 'ended'
    started_by UUID REFERENCES public."Users"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Responses Table
CREATE TABLE public."Responses" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES public."Sessions"(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public."Questions"(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public."Users"(id),
    answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Rewards Table (Wallet Transactions)
CREATE TABLE public."Rewards" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public."Users"(id) NOT NULL,
    response_id UUID REFERENCES public."Responses"(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL, -- e.g., 'Employee Satisfaction Q2'
    amount INTEGER NOT NULL, -- Points earned or spent
    transaction_type TEXT DEFAULT 'earn' NOT NULL, -- 'earn', 'spend'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: Because we removed Supabase internal Auth logic, RLS is now solely based
-- on your own implementation, or you can manage security exclusively in your Express Node API (recommended).
