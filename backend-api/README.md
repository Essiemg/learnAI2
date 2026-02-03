# LearnAI Backend API

FastAPI backend for the LearnAI AI tutoring platform. Replaces Supabase with a custom PostgreSQL database and integrates ML models for adaptive tutoring.

## Features

- **JWT Authentication**: Secure user registration and login
- **ML Strategy Prediction**: Uses `policy_model.joblib` to predict optimal teaching strategies
- **Phi-3 Integration**: Connects to fine-tuned Phi-3 model for tutoring responses
- **Progress Tracking**: Logs all interactions and provides analytics
- **Quiz & Flashcard Generation**: AI-powered content generation

## Prerequisites

- Python 3.10+
- PostgreSQL 14+
- (Optional) CUDA-compatible GPU for Phi-3 inference

## Setup Instructions

### 1. Install PostgreSQL

#### Windows
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer
3. Set password for `postgres` user (remember this!)
4. Default port: 5432

#### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

Open a terminal/command prompt:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE learnai;

# Exit psql
\q
```

### 3. Run Schema Migration

```bash
# Navigate to backend-api folder
cd backend-api

# Run the schema SQL file
psql -U postgres -d learnai -f schema.sql
```

Or on Windows with password prompt:
```bash
psql -U postgres -d learnai -f schema.sql
```

### 4. Set Up Python Environment

```bash
# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 5. Configure Environment

Copy the example env file and edit:

```bash
copy .env.example .env
# or on macOS/Linux:
cp .env.example .env
```

Edit `.env` with your settings:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/learnai
JWT_SECRET_KEY=your-super-secret-key-change-this
POLICY_MODEL_PATH=./models/policy_model.joblib
PHI3_MODEL_PATH=./models/phi3-base
PHI3_LORA_PATH=./models/phi3-lora-adapter
DEBUG=True
```

### 6. Add Your ML Models

Create a `models` folder and add your files:

```
backend-api/
  models/
    policy_model.joblib      # Your trained strategy predictor
    phi3-base/               # Base Phi-3 model (optional)
    phi3-lora-adapter/       # Your LoRA adapter (optional)
```

**Note**: If models are not found, the backend will use fallback logic for tutoring responses.

### 7. Start the Backend

```bash
# From backend-api folder
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Docs: http://localhost:8000/api/docs
- Health: http://localhost:8000/api/health

## API Endpoints

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login and get JWT |
| `/api/auth/me` | GET | Get current user profile |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Reset password with token |
| `/api/auth/update-password` | POST | Update password (authenticated) |

### Tutoring
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tutor` | POST | Get AI tutoring response |
| `/api/progress` | GET | Get learning stats |
| `/api/progress/subjects` | GET | Get per-subject breakdown |

### Content
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/goals` | GET/POST | Manage learning goals |
| `/api/chat/sessions` | GET/POST | Manage chat history |
| `/api/quizzes` | GET | List quizzes |
| `/api/quizzes/generate` | POST | Generate new quiz |
| `/api/flashcards` | GET | List flashcard sets |
| `/api/flashcards/generate` | POST | Generate flashcards |
| `/api/essays/grade` | POST | Get AI essay feedback |
| `/api/summaries/generate` | POST | Generate text summary |
| `/api/diagrams/generate` | POST | Generate Mermaid diagram |

## Using with the Frontend

### 1. Start the backend (port 8000)
```bash
cd backend-api
uvicorn main:app --reload --port 8000
```

### 2. Configure frontend environment

Create/update `.env` in the frontend root:
```env
VITE_API_URL=http://localhost:8000/api
```

### 3. Start the frontend (port 5173)
```bash
cd ..  # Go to root folder
npm run dev
```

## Docker Alternative (Optional)

If you prefer Docker for PostgreSQL:

```bash
cd backend-api
docker-compose up -d
```

This starts PostgreSQL on port 5432 with the schema already applied.

## Project Structure

```
backend-api/
├── main.py              # FastAPI app entry point
├── config.py            # Configuration settings
├── db.py                # Database connection
├── models.py            # SQLAlchemy ORM models
├── schemas.py           # Pydantic request/response schemas
├── auth.py              # JWT utilities
├── ml_models.py         # ML model loading and inference
├── schema.sql           # Database schema
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
├── docker-compose.yml   # Optional Docker setup
└── routers/
    ├── auth_routes.py       # /api/auth/*
    ├── tutor_routes.py      # /api/tutor
    ├── progress_routes.py   # /api/progress
    ├── goals_routes.py      # /api/goals
    ├── chat_routes.py       # /api/chat/*
    ├── quiz_routes.py       # /api/quizzes/*
    ├── flashcard_routes.py  # /api/flashcards/*
    ├── essay_routes.py      # /api/essays/*
    ├── summary_routes.py    # /api/summaries/*
    └── diagram_routes.py    # /api/diagrams/*
```

## Troubleshooting

### "Connection refused" to PostgreSQL
- Make sure PostgreSQL is running
- Check the port in DATABASE_URL matches PostgreSQL config
- Verify username/password

### "Module not found" errors
- Make sure virtual environment is activated
- Run `pip install -r requirements.txt` again

### Models not loading
- Check file paths in `.env` are correct
- For Phi-3, ensure you have enough RAM (8GB+) or GPU
- Set `DEBUG=True` to skip model loading for testing

### CORS errors from frontend
- Verify the frontend URL is in the CORS origins list in `main.py`
- Default allowed: localhost:3000, localhost:5173, localhost:8080

## License

MIT
