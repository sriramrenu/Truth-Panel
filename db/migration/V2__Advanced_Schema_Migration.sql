-- =============================================================================
-- V2__Advanced_Schema_Migration.sql
-- TRUTH PANEL - TRANSITION FROM V1 TO V2
-- =============================================================================

-- Start transaction
BEGIN;

-- 0. PREPARATION - NEW ENUMS AND EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

DO $$ BEGIN
    CREATE TYPE public.session_status     AS ENUM ('draft', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.submission_status  AS ENUM ('in_progress', 'submitted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.question_type      AS ENUM ('MCQ', 'TEXT', 'RATING', 'BOOLEAN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.transaction_type   AS ENUM ('earn', 'spend');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.audit_action       AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'score', 'redeem', 'transfer');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- 1. FUNCTIONS & TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance INTEGER := 0;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));
    SELECT COALESCE(balance_after, 0) INTO current_balance
    FROM public."Transactions"
    WHERE user_id = NEW.user_id AND deleted_at IS NULL
    ORDER BY created_at DESC, id DESC LIMIT 1;

    IF NEW.type = 'earn' THEN
        NEW.balance_after := current_balance + NEW.amount;
    ELSE
        IF current_balance < NEW.amount THEN
            RAISE EXCEPTION 'Insufficient balance';
        END IF;
        NEW.balance_after := current_balance - NEW.amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 2. ALTER & CREATE NEW TABLES
-- =============================================================================

-- Update Users
ALTER TABLE public."Users" ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public."Users" ADD COLUMN IF NOT EXISTS department TEXT;

-- Create Survey_Versions
CREATE TABLE IF NOT EXISTS public."Survey_Versions" (
    id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_id           UUID    NOT NULL,
    version_number      INTEGER NOT NULL,
    title               TEXT    NOT NULL,
    description         TEXT,
    max_score           INTEGER,
    start_time          TIMESTAMPTZ,
    end_time            TIMESTAMPTZ,
    points_per_question INTEGER DEFAULT 1 NOT NULL,
    search_vector       tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED,
    created_at          TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at          TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT unique_survey_version_num UNIQUE (survey_id, version_number)
);

-- Create Submissions
CREATE TABLE IF NOT EXISTS public."Submissions" (
    id              UUID                   DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id      UUID                   NOT NULL,
    user_id         UUID,
    idempotency_key UUID                   UNIQUE,
    attempt_number  INTEGER                DEFAULT 1 NOT NULL,
    status          public.submission_status DEFAULT 'in_progress' NOT NULL,
    submitted_at    TIMESTAMPTZ,
    score           INTEGER,
    feedback        TEXT,
    metadata        JSONB                  DEFAULT '{}'::jsonb,
    anonymized_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ            DEFAULT timezone('utc', now()) NOT NULL,
    updated_at      TIMESTAMPTZ            DEFAULT timezone('utc', now()) NOT NULL,
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT unique_attempt UNIQUE (session_id, user_id, attempt_number)
);

-- Create Partitioned Responses (Temp structure)
CREATE TABLE IF NOT EXISTS public."Responses_New" (
    id                     UUID        DEFAULT gen_random_uuid(),
    submission_id          UUID        NOT NULL,
    question_id            UUID        NOT NULL,
    question_text_snapshot TEXT        NOT NULL,
    answer                 TEXT        NOT NULL,
    created_at             TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at             TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    deleted_at             TIMESTAMPTZ,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS public."Responses_y2024" PARTITION OF public."Responses_New" FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS public."Responses_y2025" PARTITION OF public."Responses_New" FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS public."Responses_y2026" PARTITION OF public."Responses_New" FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Create Transactions
CREATE TABLE IF NOT EXISTS public."Transactions" (
    id            UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       UUID                     NOT NULL,
    submission_id UUID,
    amount        INTEGER                  NOT NULL CHECK (amount > 0),
    balance_after INTEGER,
    type          public.transaction_type  DEFAULT 'earn' NOT NULL,
    status        public.transaction_status DEFAULT 'completed' NOT NULL,
    currency      TEXT                     DEFAULT 'Neu Coins' NOT NULL,
    description   TEXT,
    created_at    TIMESTAMPTZ              DEFAULT timezone('utc', now()) NOT NULL,
    updated_at    TIMESTAMPTZ              DEFAULT timezone('utc', now()) NOT NULL,
    deleted_at    TIMESTAMPTZ
);

-- Create Audit Logs
CREATE TABLE IF NOT EXISTS public."Audit_Logs" (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID,
    action      public.audit_action NOT NULL,
    table_name  TEXT        NOT NULL,
    record_id   UUID        NOT NULL,
    old_data    JSONB,
    new_data    JSONB,
    ip_address  TEXT,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Create Notification Types
CREATE TABLE IF NOT EXISTS public."Notification_Types" (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);


-- 3. DATA MIGRATION
-- =============================================================================

-- Migrate Surveys to Survey_Versions (V1)
INSERT INTO public."Survey_Versions" (survey_id, version_number, title, description, start_time, end_time, points_per_question, created_at, updated_at)
SELECT id, 1, title, description, start_time, end_time, points_per_question, created_at, updated_at
FROM public."Surveys";

-- Link Questions & Sessions to versions
ALTER TABLE public."Questions" ADD COLUMN survey_version_id UUID;
ALTER TABLE public."Sessions" ADD COLUMN survey_version_id UUID;

UPDATE public."Questions" q SET survey_version_id = sv.id FROM public."Survey_Versions" sv WHERE sv.survey_id = q.survey_id;
UPDATE public."Sessions" s SET survey_version_id = sv.id FROM public."Survey_Versions" sv WHERE sv.survey_id = s.survey_id;

-- Create Submissions
INSERT INTO public."Submissions" (id, session_id, user_id, status, submitted_at, created_at, updated_at)
SELECT gen_random_uuid(), session_id, user_id, 'submitted', MAX(created_at), MIN(created_at), MAX(updated_at)
FROM public."Responses"
GROUP BY session_id, user_id;

-- Migrate Responses
INSERT INTO public."Responses_New" (submission_id, question_id, question_text_snapshot, answer, created_at, updated_at, deleted_at)
SELECT sub.id, r.question_id, q.question_text, r.answer, r.created_at, r.updated_at, r.deleted_at
FROM public."Responses" r
JOIN public."Submissions" sub ON sub.session_id = r.session_id AND sub.user_id = r.user_id
JOIN public."Questions" q ON q.id = r.question_id;

-- Migrate Rewards
INSERT INTO public."Transactions" (user_id, amount, type, description, created_at, updated_at, deleted_at)
SELECT user_id, ABS(points), CASE WHEN points >= 0 THEN 'earn'::public.transaction_type ELSE 'spend'::public.transaction_type END, session_name, updated_at, updated_at, deleted_at
FROM public."Rewards";


-- 4. CLEANUP AND FINALIZATION
-- =============================================================================

-- Switch Responses tables
ALTER TABLE public."Responses" RENAME TO "Responses_Old";
ALTER TABLE public."Responses_New" RENAME TO "Responses";

-- Rename Partitions to match parent
ALTER TABLE public."Responses_y2024" RENAME TO "Responses_p2024";
ALTER TABLE public."Responses_y2025" RENAME TO "Responses_p2025";
ALTER TABLE public."Responses_y2026" RENAME TO "Responses_p2026";

-- Update Foreign Keys
ALTER TABLE public."Questions" DROP COLUMN survey_id;
ALTER TABLE public."Sessions" DROP COLUMN survey_id;
ALTER TABLE public."Questions" ALTER COLUMN survey_version_id SET NOT NULL;
ALTER TABLE public."Sessions" ALTER COLUMN survey_version_id SET NOT NULL;
ALTER TABLE public."Questions" ADD CONSTRAINT fk_q_version FOREIGN KEY (survey_version_id) REFERENCES public."Survey_Versions"(id);
ALTER TABLE public."Sessions" ADD CONSTRAINT fk_s_version FOREIGN KEY (survey_version_id) REFERENCES public."Survey_Versions"(id);

-- Add logic check to Questions
ALTER TABLE public."Questions" ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE public."Questions" ADD COLUMN IF NOT EXISTS logic JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."Questions" ADD CONSTRAINT check_logic_is_object CHECK (jsonb_typeof(logic) = 'object');

-- Insert notification types
INSERT INTO public."Notification_Types" (key, label, description) VALUES
    ('survey_assigned',   'Survey Assigned',   'A new survey has been assigned'),
    ('session_started',   'Session Started',   'A survey session has been started'),
    ('submission_scored', 'Submission Scored', 'A submission has been graded'),
    ('reward_earned',     'Reward Earned',     'User has received Neu Coins')
ON CONFLICT (key) DO NOTHING;

-- Audit Rule
CREATE RULE no_delete_audit_logs AS ON DELETE TO public."Audit_Logs" DO INSTEAD NOTHING;

COMMIT;
