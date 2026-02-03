-- =============================================================================
-- LearnAI Database Schema
-- =============================================================================
-- PostgreSQL schema for the AI Tutoring Platform
-- 
-- Database: ai_tutor
-- 
-- Instructions:
-- 1. Create the database:
--    CREATE DATABASE ai_tutor;
--
-- 2. Connect to the database:
--    \c ai_tutor
--
-- 3. Run this script:
--    \i schema.sql
--
-- Or from command line:
--    psql -U postgres -d ai_tutor -f schema.sql
-- =============================================================================

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
-- Core user account table storing credentials and profile information.
-- This is the central entity that all other tables reference.

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    grade INTEGER NOT NULL DEFAULT 1 CHECK (grade >= 1 AND grade <= 12),
    role VARCHAR(50) DEFAULT 'student',  -- student, parent, admin
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

COMMENT ON TABLE users IS 'User accounts for students, parents, and administrators';
COMMENT ON COLUMN users.grade IS 'Education grade level (1-12)';
COMMENT ON COLUMN users.role IS 'User role: student, parent, or admin';


-- =============================================================================
-- SESSIONS TABLE
-- =============================================================================
-- Chat/tutoring sessions. Each session can contain multiple messages.

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    topic VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);

COMMENT ON TABLE sessions IS 'Chat/tutoring sessions between users and the AI tutor';


-- =============================================================================
-- MESSAGES TABLE
-- =============================================================================
-- Individual messages within a session.

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

COMMENT ON TABLE messages IS 'Chat messages within tutoring sessions';
COMMENT ON COLUMN messages.role IS 'Message author: user or assistant';


-- =============================================================================
-- INTERACTIONS TABLE
-- =============================================================================
-- Learning interaction logs for analytics and ML training.
-- Used by the policy model to determine optimal teaching strategies.

CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    mistakes INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0,  -- Time in seconds
    frustration INTEGER DEFAULT 0 CHECK (frustration >= 0 AND frustration <= 10),
    recent_accuracy FLOAT DEFAULT 0.0 CHECK (recent_accuracy >= 0.0 AND recent_accuracy <= 1.0),
    strategy VARCHAR(100),  -- Teaching strategy used
    was_helpful BOOLEAN,    -- User feedback
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_subject ON interactions(subject);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at);

COMMENT ON TABLE interactions IS 'Learning interaction logs for analytics and ML training';
COMMENT ON COLUMN interactions.frustration IS 'User frustration level (0-10 scale)';
COMMENT ON COLUMN interactions.strategy IS 'Teaching strategy used by the AI tutor';


-- =============================================================================
-- GOALS TABLE
-- =============================================================================
-- User-defined learning goals with deadlines.

CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_is_completed ON goals(is_completed);

COMMENT ON TABLE goals IS 'User-defined learning goals';


-- =============================================================================
-- STUDY EVENTS TABLE
-- =============================================================================
-- Tracks study activities for analytics and progress monitoring.

CREATE TABLE IF NOT EXISTS study_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,  -- quiz, flashcard, chat, summary, diagram
    subject VARCHAR(100),
    topic VARCHAR(255),
    duration_seconds INTEGER DEFAULT 0,
    score FLOAT,  -- Optional score if applicable
    event_data JSONB,  -- Additional event-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_study_events_user_id ON study_events(user_id);
CREATE INDEX IF NOT EXISTS idx_study_events_event_type ON study_events(event_type);
CREATE INDEX IF NOT EXISTS idx_study_events_created_at ON study_events(created_at);

COMMENT ON TABLE study_events IS 'Study activity tracking for analytics';


-- =============================================================================
-- FLASHCARD SETS TABLE
-- =============================================================================
-- Collections of flashcards for studying topics.

CREATE TABLE IF NOT EXISTS flashcard_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    topic VARCHAR(255),
    card_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flashcard_sets_user_id ON flashcard_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_subject ON flashcard_sets(subject);

COMMENT ON TABLE flashcard_sets IS 'Collections of flashcards for studying';


-- =============================================================================
-- FLASHCARDS TABLE
-- =============================================================================
-- Individual flashcards with front (question) and back (answer).

CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_id UUID NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
    front TEXT NOT NULL,  -- Question/term
    back TEXT NOT NULL,   -- Answer/definition
    position INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    times_incorrect INTEGER DEFAULT 0,
    last_reviewed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flashcards_set_id ON flashcards(set_id);

COMMENT ON TABLE flashcards IS 'Individual flashcards within a set';


-- =============================================================================
-- QUIZ SETS TABLE
-- =============================================================================
-- Collections of quiz questions on specific topics.

CREATE TABLE IF NOT EXISTS quiz_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    topic VARCHAR(255),
    question_count INTEGER DEFAULT 0,
    time_limit_minutes INTEGER,  -- Optional time limit
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_sets_user_id ON quiz_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sets_subject ON quiz_sets(subject);

COMMENT ON TABLE quiz_sets IS 'Collections of quiz questions';


-- =============================================================================
-- QUIZ QUESTIONS TABLE
-- =============================================================================
-- Individual quiz questions within a quiz set.

CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_id UUID NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice',  -- multiple_choice, true_false, short_answer
    options JSONB,  -- Array of options for multiple choice
    correct_answer TEXT NOT NULL,
    explanation TEXT,  -- Explanation of the answer
    points INTEGER DEFAULT 1,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_set_id ON quiz_questions(set_id);

COMMENT ON TABLE quiz_questions IS 'Individual quiz questions';
COMMENT ON COLUMN quiz_questions.options IS 'JSON array of answer options for multiple choice';


-- =============================================================================
-- QUIZ ATTEMPTS TABLE
-- =============================================================================
-- Records each time a user attempts a quiz.

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    set_id UUID NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE,
    score FLOAT,
    total_points INTEGER DEFAULT 0,
    earned_points INTEGER DEFAULT 0,
    time_taken_seconds INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_set_id ON quiz_attempts(set_id);

COMMENT ON TABLE quiz_attempts IS 'User quiz attempts and scores';


-- =============================================================================
-- QUIZ ANSWERS TABLE
-- =============================================================================
-- Records user answers to quiz questions.

CREATE TABLE IF NOT EXISTS quiz_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    user_answer TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    points_earned INTEGER DEFAULT 0,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt_id ON quiz_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id ON quiz_answers(question_id);

COMMENT ON TABLE quiz_answers IS 'User answers to quiz questions';


-- =============================================================================
-- SUMMARIES TABLE
-- =============================================================================
-- AI-generated summaries from text, documents, or URLs.

CREATE TABLE IF NOT EXISTS summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    source_type VARCHAR(50),  -- text, file, url
    source_content TEXT,  -- Original content or reference
    summary_text TEXT NOT NULL,
    summary_length VARCHAR(20) DEFAULT 'medium',  -- short, medium, long
    subject VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at);

COMMENT ON TABLE summaries IS 'AI-generated summaries';


-- =============================================================================
-- DIAGRAMS TABLE
-- =============================================================================
-- AI-generated Mermaid diagrams.

CREATE TABLE IF NOT EXISTS diagrams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    topic VARCHAR(255),
    diagram_type VARCHAR(50) NOT NULL,  -- flowchart, mindmap, sequence, etc.
    mermaid_code TEXT NOT NULL,
    source_content TEXT,  -- Original content used to generate
    subject VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_diagrams_user_id ON diagrams(user_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_created_at ON diagrams(created_at);

COMMENT ON TABLE diagrams IS 'AI-generated Mermaid diagrams';


-- =============================================================================
-- TRIGGER FUNCTIONS
-- =============================================================================
-- Automatically update updated_at timestamp on row updates.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcard_sets_updated_at
    BEFORE UPDATE ON flashcard_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_sets_updated_at
    BEFORE UPDATE ON quiz_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- LEGACY COMPATIBILITY TABLES
-- =============================================================================
-- These tables support the simpler JSON-based data storage used by existing routers.

-- Chat sessions with messages stored as JSON
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic VARCHAR(255),
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at);

-- Quiz sessions with questions/answers stored as JSON
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic VARCHAR(255) NOT NULL,
    questions JSONB DEFAULT '[]'::jsonb,
    answers JSONB DEFAULT '[]'::jsonb,
    score FLOAT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON quiz_sessions(user_id);

-- Flashcard sessions with cards stored as JSON
CREATE TABLE IF NOT EXISTS flashcard_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic VARCHAR(255) NOT NULL,
    cards JSONB DEFAULT '[]'::jsonb,
    current_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_user_id ON flashcard_sessions(user_id);

-- Trigger for chat_sessions updated_at
CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- List all created tables

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
