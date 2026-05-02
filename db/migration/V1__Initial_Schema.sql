-- =============================================================================
-- V1__Initial_Schema.sql
-- TRUTH PANEL — FRESH DATABASE SETUP
-- Pure Postgres 13+ | Zero Platform Lock-in
-- Run this once on a brand new empty database.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 0. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- =============================================================================
-- 1. ENUMS
-- =============================================================================

CREATE TYPE public.user_role          AS ENUM ('admin', 'worker', 'manager');
CREATE TYPE public.session_status     AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE public.submission_status  AS ENUM ('in_progress', 'submitted');
CREATE TYPE public.question_type      AS ENUM ('MCQ', 'TEXT', 'RATING', 'BOOLEAN');
CREATE TYPE public.transaction_type   AS ENUM ('earn', 'spend');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE public.audit_action       AS ENUM (
    'create', 'update', 'delete',
    'login', 'logout',
    'score', 'redeem', 'transfer'
);


-- =============================================================================
-- 2. FUNCTIONS
-- =============================================================================

-- Auto-updates updated_at on every row change
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Wallet balance computed in DB — never trusted from app layer.
-- Advisory lock per user prevents concurrent insert race conditions.
CREATE OR REPLACE FUNCTION calculate_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance INTEGER := 0;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));

    SELECT COALESCE(balance_after, 0) INTO current_balance
    FROM public."Transactions"
    WHERE user_id = NEW.user_id
      AND deleted_at IS NULL
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    IF NEW.type = 'earn' THEN
        NEW.balance_after := current_balance + NEW.amount;
    ELSE
        IF current_balance < NEW.amount THEN
            RAISE EXCEPTION
                'Insufficient balance for user % (Current: %, Required: %)',
                NEW.user_id, current_balance, NEW.amount;
        END IF;
        NEW.balance_after := current_balance - NEW.amount;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Score guard — rejects scores exceeding survey max_score.
-- NULL max_score = uncapped. NULL score = not yet graded. Both skip the check.
CREATE OR REPLACE FUNCTION check_submission_score()
RETURNS TRIGGER AS $$
DECLARE
    v_max_score INTEGER;
BEGIN
    SELECT sv.max_score INTO v_max_score
    FROM public."Sessions" s
    JOIN public."Survey_Versions" sv ON sv.id = s.survey_version_id
    WHERE s.id = NEW.session_id;

    IF NEW.score IS NOT NULL AND v_max_score IS NOT NULL THEN
        IF NEW.score > v_max_score THEN
            RAISE EXCEPTION
                'Invalid score: % exceeds survey max_score of %',
                NEW.score, v_max_score;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Materialized view refresh — call from your backend scheduler.
CREATE OR REPLACE FUNCTION refresh_user_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_stats;
END;
$$ LANGUAGE plpgsql;


-- Idempotent yearly partition creator.
-- Usage: SELECT create_responses_partition(2027);
-- Safe to call on app startup — IF NOT EXISTS prevents duplicate errors.
CREATE OR REPLACE FUNCTION create_responses_partition(target_year INTEGER)
RETURNS void AS $$
BEGIN
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS public."Responses_y%s"
         PARTITION OF public."Responses"
         FOR VALUES FROM (''%s-01-01'') TO (''%s-01-01'')',
        target_year, target_year, target_year + 1
    );
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 3. USERS
-- =============================================================================

CREATE TABLE public."Users" (
    id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    email         TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,
    name          TEXT,
    phone_number  TEXT,
    department    TEXT,
    role          public.user_role DEFAULT 'worker' NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at    TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    deleted_at    TIMESTAMPTZ
);

-- Unique email among non-deleted users only
CREATE UNIQUE INDEX idx_users_email_active
    ON public."Users"(email)
    WHERE deleted_at IS NULL;

CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON public."Users"
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE VIEW public."ActiveUsers" AS
    SELECT * FROM public."Users" WHERE deleted_at IS NULL;


-- =============================================================================
-- 4. SURVEYS — Identity anchor (never holds content directly)
-- =============================================================================

CREATE TABLE public."Surveys" (
    id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    category   TEXT        DEFAULT 'General',
    created_by UUID        REFERENCES public."Users"(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE VIEW public."ActiveSurveys" AS
    SELECT * FROM public."Surveys" WHERE deleted_at IS NULL;


-- =============================================================================
-- 5. SURVEY VERSIONS — All editable content lives here
-- Editing a survey creates a new version; sessions lock to a specific version.
-- =============================================================================

CREATE TABLE public."Survey_Versions" (
    id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_id           UUID    REFERENCES public."Surveys"(id) NOT NULL,
    version_number      INTEGER NOT NULL,
    title               TEXT    NOT NULL,
    description         TEXT,
    max_score           INTEGER,             -- NULL = no cap on score
    start_time          TIMESTAMPTZ,
    end_time            TIMESTAMPTZ,
    points_per_question INTEGER DEFAULT 1 NOT NULL
        CHECK (points_per_question >= 0),
    -- Auto-generated full-text search vector from title + description
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english',
            coalesce(title, '') || ' ' || coalesce(description, ''))
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT unique_survey_version_num
        UNIQUE (survey_id, version_number),
    CONSTRAINT check_survey_dates
        CHECK (end_time > start_time OR end_time IS NULL)
);

-- Full-text search index (exact stem matching)
CREATE INDEX idx_surveys_search
    ON public."Survey_Versions" USING GIN (search_vector);

-- Trigram index (fuzzy/partial/typo-tolerant matching)
CREATE INDEX idx_surveys_title_trgm
    ON public."Survey_Versions" USING GIST (title gist_trgm_ops);

CREATE TRIGGER update_survey_versions_modtime
    BEFORE UPDATE ON public."Survey_Versions"
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();


-- =============================================================================
-- 6. QUESTIONS
-- =============================================================================

CREATE TABLE public."Questions" (
    id                UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_version_id UUID             REFERENCES public."Survey_Versions"(id) NOT NULL,
    question_text     TEXT             NOT NULL,
    question_type     public.question_type DEFAULT 'MCQ' NOT NULL,
    options           JSONB            DEFAULT '[]'::jsonb,
    is_required       BOOLEAN          DEFAULT true NOT NULL,
    -- Skip logic and branching rules stored as JSON object
    logic             JSONB            DEFAULT '{}'::jsonb,
    order_index       INTEGER          DEFAULT 0 NOT NULL,
    created_at        TIMESTAMPTZ      DEFAULT timezone('utc', now()) NOT NULL,
    updated_at        TIMESTAMPTZ      DEFAULT timezone('utc', now()) NOT NULL,
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT check_options_is_array
        CHECK (jsonb_typeof(options) = 'array'),
    CONSTRAINT check_mcq_has_options
        CHECK ((question_type != 'MCQ') OR (jsonb_array_length(options) >= 2)),
    CONSTRAINT check_logic_is_object
        CHECK (jsonb_typeof(logic) = 'object')
);

CREATE INDEX idx_questions_survey_version
    ON public."Questions"(survey_version_id);

CREATE TRIGGER update_questions_modtime
    BEFORE UPDATE ON public."Questions"
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE VIEW public."ActiveQuestions" AS
    SELECT * FROM public."Questions" WHERE deleted_at IS NULL;


-- =============================================================================
-- 7. SESSIONS — One live run of a specific survey version
-- =============================================================================

CREATE TABLE public."Sessions" (
    id                UUID               DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_version_id UUID               REFERENCES public."Survey_Versions"(id) NOT NULL,
    status            public.session_status DEFAULT 'active' NOT NULL,
    started_by        UUID               REFERENCES public."Users"(id),
    started_at        TIMESTAMPTZ        DEFAULT timezone('utc', now()) NOT NULL,
    updated_at        TIMESTAMPTZ        DEFAULT timezone('utc', now()) NOT NULL,
    ended_at          TIMESTAMPTZ,
    deleted_at        TIMESTAMPTZ
);

-- Full index for FK joins
CREATE INDEX idx_sessions_survey_version
    ON public."Sessions"(survey_version_id);

-- Partial index for active-only queries (most common path)
CREATE INDEX idx_sessions_active
    ON public."Sessions"(survey_version_id)
    WHERE deleted_at IS NULL;

CREATE TRIGGER update_sessions_modtime
    BEFORE UPDATE ON public."Sessions"
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE VIEW public."ActiveSessions" AS
    SELECT * FROM public."Sessions" WHERE deleted_at IS NULL;


-- =============================================================================
-- 8. SUBMISSIONS — One user's attempt within one session
-- =============================================================================

CREATE TABLE public."Submissions" (
    id              UUID                   DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id      UUID                   REFERENCES public."Sessions"(id) NOT NULL,
    user_id         UUID                   REFERENCES public."Users"(id),       -- nullable = anonymous
    idempotency_key UUID                   UNIQUE,                              -- blocks double-submit at DB level
    attempt_number  INTEGER                DEFAULT 1 NOT NULL,
    status          public.submission_status DEFAULT 'in_progress' NOT NULL,
    submitted_at    TIMESTAMPTZ,
    score           INTEGER,                                                     -- NULL until graded
    feedback        TEXT,                                                        -- admin feedback
    metadata        JSONB                  DEFAULT '{}'::jsonb,                 -- IP, user-agent, device info
    anonymized_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ            DEFAULT timezone('utc', now()) NOT NULL,
    updated_at      TIMESTAMPTZ            DEFAULT timezone('utc', now()) NOT NULL,
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT unique_attempt
        UNIQUE (session_id, user_id, attempt_number)
);

CREATE INDEX idx_submissions_session_user
    ON public."Submissions"(session_id, user_id);

CREATE INDEX idx_submissions_idempotency
    ON public."Submissions"(idempotency_key);

CREATE TRIGGER update_submissions_modtime
    BEFORE UPDATE ON public."Submissions"
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Validates score does not exceed survey's max_score
CREATE TRIGGER trg_check_score
    BEFORE INSERT OR UPDATE ON public."Submissions"
    FOR EACH ROW EXECUTE PROCEDURE check_submission_score();

CREATE VIEW public."ActiveSubmissions" AS
    SELECT * FROM public."Submissions" WHERE deleted_at IS NULL;


-- =============================================================================
-- 9. RESPONSES — Individual answers, partitioned by year
--
-- Adding next year's partition (run each November or on app startup):
--   SELECT create_responses_partition(2027);
-- =============================================================================

CREATE TABLE public."Responses" (
    id                     UUID        DEFAULT gen_random_uuid(),
    submission_id          UUID        REFERENCES public."Submissions"(id) NOT NULL,
    question_id            UUID        REFERENCES public."Questions"(id) NOT NULL,
    -- Snapshot of question text at answer time — survives future edits
    question_text_snapshot TEXT        NOT NULL,
    answer                 TEXT        NOT NULL,
    created_at             TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at             TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    deleted_at             TIMESTAMPTZ,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Pre-built partitions — add yearly via create_responses_partition()
CREATE TABLE public."Responses_y2024"
    PARTITION OF public."Responses"
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE public."Responses_y2025"
    PARTITION OF public."Responses"
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE public."Responses_y2026"
    PARTITION OF public."Responses"
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Index for question-level analytics
CREATE INDEX idx_responses_question_id
    ON public."Responses"(question_id);

-- Index for fetching all responses in a submission
CREATE INDEX idx_responses_submission_id
    ON public."Responses"(submission_id);

CREATE TRIGGER update_responses_modtime
    BEFORE UPDATE ON public."Responses"
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();


-- =============================================================================
-- 10. TRANSACTIONS — Append-only wallet ledger
-- balance_after is always computed by trigger, never set by app code.
-- =============================================================================

CREATE TABLE public."Transactions" (
    id            UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       UUID                     REFERENCES public."Users"(id) NOT NULL,
    submission_id UUID                     REFERENCES public."Submissions"(id),
    amount        INTEGER                  NOT NULL CHECK (amount > 0),
    balance_after INTEGER,                 -- set by trg_calculate_balance
    type          public.transaction_type  DEFAULT 'earn' NOT NULL,
    status        public.transaction_status DEFAULT 'completed' NOT NULL,
    currency      TEXT                     DEFAULT 'Neu Coins' NOT NULL,
    description   TEXT,
    created_at    TIMESTAMPTZ              DEFAULT timezone('utc', now()) NOT NULL,
    updated_at    TIMESTAMPTZ              DEFAULT timezone('utc', now()) NOT NULL,
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_transactions_user
    ON public."Transactions"(user_id);

CREATE TRIGGER update_transactions_modtime
    BEFORE UPDATE ON public."Transactions"
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Computes balance_after before insert — with advisory lock to prevent race conditions
CREATE TRIGGER trg_calculate_balance
    BEFORE INSERT ON public."Transactions"
    FOR EACH ROW EXECUTE PROCEDURE calculate_transaction_balance();


-- =============================================================================
-- 11. NOTIFICATION TYPES — Lookup table (extend via INSERT, no ALTER TYPE needed)
-- =============================================================================

CREATE TABLE public."Notification_Types" (
    key         TEXT        PRIMARY KEY,
    label       TEXT        NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

INSERT INTO public."Notification_Types" (key, label, description) VALUES
    ('survey_assigned',   'Survey Assigned',   'A new survey has been assigned to the user'),
    ('session_started',   'Session Started',   'A survey session has been started'),
    ('submission_scored', 'Submission Scored', 'A submission has been graded'),
    ('reward_earned',     'Reward Earned',     'User has received Neu Coins');


-- =============================================================================
-- 12. NOTIFICATIONS
-- =============================================================================

CREATE TABLE public."Notifications" (
    id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID        REFERENCES public."Users"(id) NOT NULL,
    title      TEXT        NOT NULL,
    message    TEXT        NOT NULL,
    type       TEXT        NOT NULL
        REFERENCES public."Notification_Types"(key),
    related_id UUID,
    is_read    BOOLEAN     DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- Optimised for: unread notifications for a user, newest first
CREATE INDEX idx_notifications_feed
    ON public."Notifications"(user_id, is_read, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE TRIGGER update_notifications_modtime
    BEFORE UPDATE ON public."Notifications"
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE VIEW public."ActiveNotifications" AS
    SELECT * FROM public."Notifications" WHERE deleted_at IS NULL;


-- =============================================================================
-- 13. AUDIT LOGS — Immutable record of all significant actions
-- No soft delete. No UPDATE trigger. Append-only by design.
-- The no_delete rule blocks accidental DELETE from app layer.
-- =============================================================================

CREATE TABLE public."Audit_Logs" (
    id          UUID               DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID               REFERENCES public."Users"(id),
    action      public.audit_action NOT NULL,
    table_name  TEXT               NOT NULL,
    record_id   UUID               NOT NULL,
    old_data    JSONB,
    new_data    JSONB,
    ip_address  TEXT,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ        DEFAULT timezone('utc', now()) NOT NULL
);

-- Query by actor
CREATE INDEX idx_audit_logs_user
    ON public."Audit_Logs"(user_id);

-- Query by affected record
CREATE INDEX idx_audit_logs_record
    ON public."Audit_Logs"(table_name, record_id);

-- Hard block on DELETE — audit logs are permanent
CREATE RULE no_delete_audit_logs
    AS ON DELETE TO public."Audit_Logs"
    DO INSTEAD NOTHING;


-- =============================================================================
-- 14. ANALYTICS — Materialized view for leaderboards and dashboards
--
-- Refresh strategy (pick one for your stack):
--   A. Backend cron:  SELECT refresh_user_stats();  every 5 min
--   B. pgAgent job:   point job at refresh_user_stats()
--   C. App startup:   call on boot + interval
-- =============================================================================

CREATE MATERIALIZED VIEW public.mv_user_stats AS
SELECT
    user_id,
    COUNT(id) FILTER (WHERE status = 'submitted') AS total_submissions,
    SUM(score)                                     AS total_score
FROM public."Submissions"
WHERE deleted_at IS NULL
GROUP BY user_id;

-- Required for REFRESH MATERIALIZED VIEW CONCURRENTLY (zero-downtime refresh)
CREATE UNIQUE INDEX idx_mv_user_stats_user_id
    ON public.mv_user_stats(user_id);


-- =============================================================================
-- COMMIT
-- If anything above failed, Postgres rolls back everything cleanly.
-- =============================================================================

COMMIT;