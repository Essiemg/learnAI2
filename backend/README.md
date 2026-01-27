# Toki Backend - Local Development

This folder contains standalone versions of the Supabase Edge Functions that can run locally using the Google Gemini API directly, without requiring the Lovable gateway.

## Prerequisites

1. **Docker Desktop** - [Download here](https://docker.com/products/docker-desktop)
2. **Supabase CLI** - Install with `npm install -g supabase`
3. **Deno** - [Install here](https://deno.land/manual/getting_started/installation)

## API Keys Required

| Key | Purpose | Where to Get |
|-----|---------|--------------|
| `GOOGLE_AI_API_KEY` | AI tutor, content generation, file processing | [Google AI Studio](https://aistudio.google.com/) |
| `ELEVENLABS_API_KEY` | Text-to-speech, speech-to-text | [ElevenLabs](https://elevenlabs.io/) |

## Quick Start

### 1. Set Up Environment Variables

```bash
# Copy the template
cp backend/.env.example backend/.env

# Edit the file and add your API keys
nano backend/.env
```

### 2. Start Local Supabase

```bash
# From the project root
supabase start

# This will output your local Supabase credentials
# Copy the SUPABASE_URL and SUPABASE_ANON_KEY to your .env file
```

### 3. Run Functions Locally

**Option A: Using Supabase CLI (Recommended)**

```bash
# Serve all functions
supabase functions serve --env-file ./backend/.env
```

**Option B: Run Individual Functions with Deno**

```bash
# Run tutor-chat
deno run --allow-net --allow-env --allow-read backend/tutor-chat/index.ts

# Run generate-content
deno run --allow-net --allow-env --allow-read backend/generate-content/index.ts
```

## Function Endpoints

When running locally with Supabase CLI, your functions will be available at:

| Function | Local URL |
|----------|-----------|
| tutor-chat | `http://localhost:54321/functions/v1/tutor-chat` |
| generate-content | `http://localhost:54321/functions/v1/generate-content` |
| process-file | `http://localhost:54321/functions/v1/process-file` |
| gemini-live | `ws://localhost:54321/functions/v1/gemini-live` |
| elevenlabs-tts | `http://localhost:54321/functions/v1/elevenlabs-tts` |
| elevenlabs-stt | `http://localhost:54321/functions/v1/elevenlabs-stt` |

## Architecture

```
backend/
├── _shared/
│   └── gemini.ts          # Shared Gemini API utilities
├── tutor-chat/            # AI tutor conversation
├── generate-content/      # Flashcards, quizzes, summaries, diagrams
├── process-file/          # File/image processing
├── gemini-live/           # Real-time voice (WebSocket)
├── elevenlabs-tts/        # Text-to-speech
├── elevenlabs-stt/        # Speech-to-text
└── seed-admin/            # Admin seeding utility
```

## Key Differences from Cloud Version

| Aspect | Cloud (Lovable) | Local (This Folder) |
|--------|-----------------|---------------------|
| AI Gateway | `https://ai.gateway.lovable.dev` | Direct Gemini API |
| Auth | `LOVABLE_API_KEY` | `GOOGLE_AI_API_KEY` |
| Message Format | OpenAI-compatible | Native Gemini format |

## Troubleshooting

### "GOOGLE_AI_API_KEY is not configured"
Make sure your `.env` file exists and contains the key:
```
GOOGLE_AI_API_KEY=your-key-here
```

### "Connection refused" errors
Ensure Docker Desktop is running and Supabase is started:
```bash
supabase status
```

### WebSocket issues with gemini-live
The Gemini Live API requires a valid API key and proper WebSocket upgrade handling. Check browser console for connection errors.

## Updating Frontend to Use Local Backend

To point your frontend to the local backend, update your `.env` file:

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=your-local-anon-key
```

Get your local anon key from `supabase status` output.
