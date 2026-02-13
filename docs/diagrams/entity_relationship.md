# Entity Relationship Diagram
# Entity Relationship Diagram (Table Layout)

| Entity           | Attributes                                                                                       |
|------------------|--------------------------------------------------------------------------------------------------|
| User             | id (GUID, PK), name (String), email (String), password_hash (String), grade (Integer), role (String), avatar_url (String), ... |
| Session          | id (GUID, PK), user_id (GUID, FK), title (String), topic (String), started_at (DateTime), ended_at (DateTime), is_active (Boolean), ... |
| Message          | id (GUID, PK), session_id (GUID, FK), role (String), content (Text), created_at (DateTime), ... |
| Interaction      | id (GUID, PK), user_id (GUID, FK), subject (String), question (Text), answer (Text), mistakes (Integer), time_spent (Integer), frustration (Integer), recent_accuracy (Float), strategy (String), was_helpful (Boolean), created_at (DateTime), ... |
| Goal             | id (GUID, PK), user_id (GUID, FK), title (String), description (Text), target_date (DateTime), is_completed (Boolean), created_at (DateTime), updated_at (DateTime), ... |
| StudyEvent       | id (GUID, PK), user_id (GUID, FK), event_type (String), subject (String), topic (String), duration_seconds (Integer), score (Float), event_data (JSON), created_at (DateTime), ... |
| FlashcardSet     | id (GUID, PK), user_id (GUID, FK), title (String), description (Text), subject (String), topic (String), card_count (Integer), is_public (Boolean), created_at (DateTime), updated_at (DateTime), ... |
| Flashcard        | id (GUID, PK), set_id (GUID, FK), front (Text), back (Text), position (Integer), times_correct (Integer), times_incorrect (Integer), last_reviewed (DateTime), created_at (DateTime), ... |
| QuizSet          | id (GUID, PK), user_id (GUID, FK), title (String), description (Text), subject (String), topic (String), question_count (Integer), time_limit_minutes (Integer), is_public (Boolean), created_at (DateTime), updated_at (DateTime), ... |
| QuizQuestion     | id (GUID, PK), set_id (GUID, FK), question_text (Text), question_type (String), options (JSON), correct_answer (Text), explanation (Text), points (Integer), position (Integer), created_at (DateTime), ... |
| QuizAttempt      | id (GUID, PK), user_id (GUID, FK), set_id (GUID, FK), score (Float), total_points (Integer), earned_points (Integer), time_taken_seconds (Integer), completed (Boolean), started_at (DateTime), completed_at (DateTime), ... |
| QuizAnswer       | id (GUID, PK), attempt_id (GUID, FK), question_id (GUID, FK), user_answer (Text), is_correct (Boolean), points_earned (Integer), answered_at (DateTime), ... |
| Summary          | id (GUID, PK), user_id (GUID, FK), title (String), source_type (String), source_content (Text), summary_text (Text), summary_length (String), subject (String), created_at (DateTime), ... |
| Diagram          | id (GUID, PK), user_id (GUID, FK), title (String), topic (String), diagram_type (String), mermaid_code (Text), source_content (Text), subject (String), created_at (DateTime), ... |
| ChatSession      | id (GUID, PK), user_id (GUID, FK), topic (String), messages (JSON), created_at (DateTime), updated_at (DateTime), ... |
| QuizSession      | id (GUID, PK), user_id (GUID, FK), topic (String), questions (JSON), answers (JSON), score (Float), completed (Boolean), created_at (DateTime), ... |
| FlashcardSession | id (GUID, PK), user_id (GUID, FK), topic (String), cards (JSON), current_index (Integer), created_at (DateTime), ... |

## Relationships

- User has many Sessions, Interactions, Goals, FlashcardSets, QuizSets, QuizAttempts, Summaries, Diagrams, StudyEvents, ChatSessions, QuizSessions, FlashcardSessions
- Session has many Messages
- FlashcardSet has many Flashcards
- QuizSet has many QuizQuestions and QuizAttempts
- QuizQuestion has many QuizAnswers
- QuizAttempt has many QuizAnswers
    }
