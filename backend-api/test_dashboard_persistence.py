
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from db import Base, get_db
from main import app
from models import User, FlashcardSession, Summary, StudyEvent
from auth import create_access_token

# Setup in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

class TestDashboardPersistence(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.client = TestClient(app)
        self.db = TestingSessionLocal()
        
        import uuid
        unique_email = f"test_{uuid.uuid4()}@example.com"
        # Create test user
        self.user = User(
            email=unique_email,
            name="Test User",
            password_hash="hashed_password",
            grade=10
        )
        self.db.add(self.user)
        self.db.commit()
        
        # Create auth token
        self.token = create_access_token(data={"sub": unique_email})
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=engine)

    @patch('routers.flashcard_routes.generate_flashcards')
    def test_flashcard_persistence_and_dashboard(self, mock_generate):
        # Mock flashcard generation
        mock_generate.return_value = [
            {"front": "Q1", "back": "A1"},
            {"front": "Q2", "back": "A2"}
        ]
        
        print("\nTesting Flashcard Persistence...")
        # 1. Generate Flashcards
        resp = self.client.post(
            "/api/flashcards/generate",
            json={"topic": "Test Topic", "num_cards": 2},
            headers=self.headers
        )
        self.assertEqual(resp.status_code, 201)
        
        # 2. Check Dashboard Stats
        resp = self.client.get("/api/reports/summary", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        print(f"Dashboard Flashcards: {data['total_flashcards']}")
        
        # Verify count is 1 (we created 1 session)
        self.assertEqual(data['total_flashcards'], 1)
        
        # Verify DB entry directly
        sessions = self.db.query(FlashcardSession).filter_by(user_id=self.user.id).all()
        self.assertEqual(len(sessions), 1)
        
        # Verify StudyEvent
        events = self.db.query(StudyEvent).filter_by(user_id=self.user.id, event_type="flashcard_generation").all()
        self.assertEqual(len(events), 1)

    @patch('routers.summary_routes.generate_summary')
    def test_summary_persistence_and_dashboard(self, mock_generate):
        # Mock summary generation
        mock_generate.return_value = "This is a summary."
        
        print("\nTesting Summary Persistence...")
        # 1. Generate Summary
        resp = self.client.post(
            "/api/summaries/generate",
            json={"topic": "Test Summary", "content": "Some content"},
            headers=self.headers
        )
        self.assertEqual(resp.status_code, 200)
        
        # 2. Check Dashboard Stats
        resp = self.client.get("/api/reports/summary", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        print(f"Dashboard Summaries: {data['total_summaries']}")
        
        # Verify count is 1
        self.assertEqual(data['total_summaries'], 1)
        
        # Verify StudyEvent (This is what we fixed)
        events = self.db.query(StudyEvent).filter_by(user_id=self.user.id, event_type="summary").all()
        self.assertEqual(len(events), 1)
        print("StudyEvent for summary found!")

if __name__ == '__main__':
    unittest.main()
