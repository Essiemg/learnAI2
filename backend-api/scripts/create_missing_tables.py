"""Create missing tables."""
import psycopg2
import sys
sys.path.insert(0, '..')
from config import get_settings

settings = get_settings()
conn = psycopg2.connect(settings.DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

# Create missing tables
sql_statements = [
    # Goals table
    """
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
    """,
    "CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);",
    
    # Chat sessions (legacy)
    """
    CREATE TABLE IF NOT EXISTS chat_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        topic VARCHAR(255),
        messages JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);",
    
    # Quiz sessions (legacy)
    """
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
    """,
    "CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON quiz_sessions(user_id);",
    
    # Flashcard sessions (legacy)
    """
    CREATE TABLE IF NOT EXISTS flashcard_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        topic VARCHAR(255) NOT NULL,
        cards JSONB DEFAULT '[]'::jsonb,
        current_index INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_user_id ON flashcard_sessions(user_id);",
]

for sql in sql_statements:
    try:
        cur.execute(sql)
        print(f"✓ Executed: {sql[:50]}...")
    except Exception as e:
        print(f"✗ Error: {e}")

cur.close()
conn.close()
print("\nDone creating missing tables!")
