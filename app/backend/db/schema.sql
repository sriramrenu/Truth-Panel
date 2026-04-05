-- TRUTH PANEL - SUPABASE SQL SCHEMA
-- Run these commands in your Supabase SQL Editor.

-- Enable UUID extension just in case
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Surveys Table
CREATE TABLE public."Surveys" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id), -- Links to Supabase Auth system
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
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
    started_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Responses Table
CREATE TABLE public."Responses" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES public."Sessions"(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public."Questions"(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Rewards Table (Wallet Transactions)
CREATE TABLE public."Rewards" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    response_id UUID REFERENCES public."Responses"(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL, -- e.g., 'Employee Satisfaction Q2'
    amount INTEGER NOT NULL, -- Points earned or spent
    transaction_type TEXT DEFAULT 'earn' NOT NULL, -- 'earn', 'spend'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) Configuration
-- ==========================================
-- Note: Since our Express Backend relies on the Service Role Key safely tucked in the server,
-- it bypasses RLS policies. However, if your frontend teammates plan to query this data
-- directly from Next.js Client Components using the anonymous key, you may need to enable RLS:
--
-- ALTER TABLE public."Surveys" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."Questions" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."Sessions" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."Responses" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."Rewards" ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Allow all read" ON public."Surveys" FOR SELECT USING (true);
-- (Add other policies as defined by your frontend team's needs).
