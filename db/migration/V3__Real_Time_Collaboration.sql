-- =============================================================================
-- V3__Real_Time_Collaboration.sql
-- TRUTH PANEL — ENTERPRISE COLLABORATION SCHEMA
-- Implements Optimistic Concurrency Control, Auditing, and Access Roles
-- =============================================================================

BEGIN;

-- 1. ADD VERSIONING TO QUESTIONS FOR OPTIMISTIC CONCURRENCY
-- -----------------------------------------------------------------------------
-- The 'version' column enables atomic updates. If the version matches, the 
-- update succeeds. If not, another user beat them to it (conflict).
ALTER TABLE public."Questions"
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES public."Users"(id);

-- 2. SURVEY COLLABORATORS (ACCESS CONTROL)
-- -----------------------------------------------------------------------------
-- Tracks which users (other than the owner) have access to a survey.
CREATE TYPE public.collaborator_role AS ENUM ('viewer', 'editor');

CREATE TABLE IF NOT EXISTS public."Survey_Collaborators" (
    survey_id  UUID                      REFERENCES public."Surveys"(id) ON DELETE CASCADE,
    user_id    UUID                      REFERENCES public."Users"(id) ON DELETE CASCADE,
    role       public.collaborator_role  NOT NULL,
    granted_by UUID                      REFERENCES public."Users"(id),
    created_at TIMESTAMPTZ               DEFAULT timezone('utc', now()) NOT NULL,
    PRIMARY KEY (survey_id, user_id)
);

-- Index to quickly find all surveys a user is collaborating on
CREATE INDEX IF NOT EXISTS idx_survey_collaborators_user_id 
ON public."Survey_Collaborators"(user_id);

-- 3. QUESTION EDIT HISTORY (AUDITING)
-- -----------------------------------------------------------------------------
-- A complete ledger of every field-level change made during real-time collab.
CREATE TABLE IF NOT EXISTS public."Question_Edit_History" (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id    UUID        UNIQUE NOT NULL, -- Used for Redis idempotency
    question_id UUID        REFERENCES public."Questions"(id) ON DELETE CASCADE,
    field       TEXT        NOT NULL,
    old_value   JSONB,      -- Can store text, arrays, objects depending on the field changed
    new_value   JSONB,
    edited_by   UUID        REFERENCES public."Users"(id),
    timestamp   TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Index to query the history of a specific question efficiently
CREATE INDEX IF NOT EXISTS idx_question_edit_history_question 
ON public."Question_Edit_History"(question_id);

-- 4. AUTHENTICATION SESSIONS (STATEFUL TRACKING)
-- -----------------------------------------------------------------------------
-- Tracks active refresh tokens to support forced logouts and token revocation.
CREATE TABLE IF NOT EXISTS public."Auth_Sessions" (
    id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id            UUID        REFERENCES public."Users"(id) ON DELETE CASCADE,
    refresh_token_hash TEXT        NOT NULL,
    device_info        TEXT,
    ip_address         TEXT,
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Index for quickly invalidating all sessions for a specific user
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id 
ON public."Auth_Sessions"(user_id);

COMMIT;
