-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Custom ENUMs
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'worker', 'manager');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Trigger Function to auto-update 'updated_at'
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public."Users" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role public.user_role DEFAULT 'worker' NOT NULL,
    created_by UUID REFERENCES public."Users"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public."Users"(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES public."Users"(id)
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public."Users"(email);

-- 2. Surveys Table
CREATE TABLE IF NOT EXISTS public."Surveys" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    points_per_question INTEGER DEFAULT 1 NOT NULL CHECK (points_per_question >= 0),
    created_by UUID REFERENCES public."Users"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public."Users"(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES public."Users"(id)
);

-- 3. Sessions Table
CREATE TABLE IF NOT EXISTS public."Sessions" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    survey_id UUID REFERENCES public."Surveys"(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    started_by UUID REFERENCES public."Users"(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public."Users"(id),
    ended_at TIMESTAMP WITH TIME ZONE,
    ended_by UUID REFERENCES public."Users"(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES public."Users"(id)
);

-- 4. Questions Table
CREATE TABLE IF NOT EXISTS public."Questions" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    survey_id UUID REFERENCES public."Surveys"(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public."Sessions"(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'MCQ' NOT NULL,
    options JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public."Users"(id)
);

-- 5. Responses Table
CREATE TABLE IF NOT EXISTS public."Responses" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    survey_id UUID REFERENCES public."Surveys"(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public."Sessions"(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public."Questions"(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public."Users"(id),
    answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public."Users"(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES public."Users"(id)
);

-- Unique constraint for response
DO $$ BEGIN
    ALTER TABLE public."Responses" ADD CONSTRAINT unique_user_response UNIQUE (session_id, question_id, user_id);
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN null;
END $$;

-- 6. Rewards Table (Neu Coins)
CREATE TABLE IF NOT EXISTS public."Rewards" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public."Users"(id) NOT NULL,
    session_id UUID REFERENCES public."Sessions"(id) ON DELETE SET NULL,
    session_name TEXT NOT NULL,
    points INTEGER NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public."Users"(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES public."Users"(id)
);

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS public."Notifications" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public."Users"(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    related_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public."Users"(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES public."Users"(id)
);

-- Triggers (Cleanup existing if any, then recreate)
DROP TRIGGER IF EXISTS update_users_modtime ON public."Users";
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public."Users" FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_surveys_modtime ON public."Surveys";
CREATE TRIGGER update_surveys_modtime BEFORE UPDATE ON public."Surveys" FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_sessions_modtime ON public."Sessions";
CREATE TRIGGER update_sessions_modtime BEFORE UPDATE ON public."Sessions" FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_questions_modtime ON public."Questions";
CREATE TRIGGER update_questions_modtime BEFORE UPDATE ON public."Questions" FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_responses_modtime ON public."Responses";
CREATE TRIGGER update_responses_modtime BEFORE UPDATE ON public."Responses" FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_rewards_modtime ON public."Rewards";
CREATE TRIGGER update_rewards_modtime BEFORE UPDATE ON public."Rewards" FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_notifications_modtime ON public."Notifications";
CREATE TRIGGER update_notifications_modtime BEFORE UPDATE ON public."Notifications" FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
