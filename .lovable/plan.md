
# Plan: Create Standalone Backend Folder

This plan creates a new `backend/` folder with standalone versions of the edge functions that use the Google Gemini API directly instead of the Lovable gateway. The existing `supabase/functions/` folder remains unchanged for cloud compatibility.

---

## What Gets Created

```
backend/
├── README.md                    # Setup and usage instructions
├── .env.example                 # Template for required API keys
├── deno.json                    # Deno configuration and import map
├── _shared/
│   └── gemini.ts               # Shared Gemini API utility
├── tutor-chat/
│   └── index.ts                # AI tutor conversation
├── generate-content/
│   └── index.ts                # Flashcards, quizzes, summaries, diagrams
├── process-file/
│   └── index.ts                # File/image processing
├── gemini-live/
│   └── index.ts                # Real-time voice (copy - already uses direct API)
├── elevenlabs-tts/
│   └── index.ts                # Text-to-speech (copy - already uses ElevenLabs)
├── elevenlabs-stt/
│   └── index.ts                # Speech-to-text (copy - already uses ElevenLabs)
└── seed-admin/
    └── index.ts                # Admin seeding (copy - no external API)
```

---

## Key Changes in Backend Functions

### API Endpoint Change

| Current (Cloud) | New (Local) |
|-----------------|-------------|
| `https://ai.gateway.lovable.dev/v1/chat/completions` | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` |

### Authentication Change

| Current | New |
|---------|-----|
| `Authorization: Bearer LOVABLE_API_KEY` | `?key=GOOGLE_AI_API_KEY` (query param) |

### Message Format Conversion

OpenAI-style messages get converted to Gemini native format:
- `role: "system"` becomes `systemInstruction`
- `role: "assistant"` becomes `role: "model"`
- `content: string` becomes `parts: [{ text: string }]`
- Image URLs become `inlineData` with base64 content

### Function Calling Conversion

OpenAI tools format converts to Gemini function declarations:
- `tools[].function` becomes `tools[].functionDeclarations[]`
- `tool_choice` becomes `toolConfig.functionCallingConfig`

---

## Files to Create

### 1. `backend/deno.json`
Deno configuration with import maps for dependencies.

### 2. `backend/.env.example`
Template showing required environment variables:
- `GOOGLE_AI_API_KEY` (required for AI features)
- `ELEVENLABS_API_KEY` (for voice features)
- `SUPABASE_URL` (local Supabase URL)
- `SUPABASE_ANON_KEY` (local anon key)
- `SUPABASE_SERVICE_ROLE_KEY` (local service role key)

### 3. `backend/README.md`
Setup instructions explaining:
- How to obtain API keys
- How to run functions locally with Deno
- How to connect to local Supabase

### 4. `backend/_shared/gemini.ts`
Shared utility module providing:
- Message format conversion (OpenAI to Gemini)
- Multimodal content handling (images, base64)
- Streaming response transformation
- Function calling format conversion
- Error handling helpers

### 5. `backend/tutor-chat/index.ts`
Converted tutor chat using Gemini API with:
- Direct Gemini API calls
- Streaming response handling
- Full learner profile support

### 6. `backend/generate-content/index.ts`
Converted content generator using Gemini API with:
- Flashcard generation via function calling
- Quiz generation via function calling
- Summary generation
- Diagram generation

### 7. `backend/process-file/index.ts`
Converted file processor using Gemini API with:
- Image analysis
- Document text extraction
- Function calling for structured output

### 8. Copy Existing Functions (No Changes Needed)
These functions already use direct APIs:
- `backend/gemini-live/index.ts` - Uses GOOGLE_AI_API_KEY
- `backend/elevenlabs-tts/index.ts` - Uses ELEVENLABS_API_KEY
- `backend/elevenlabs-stt/index.ts` - Uses ELEVENLABS_API_KEY
- `backend/seed-admin/index.ts` - No external API

---

## How to Run Locally

After the backend folder is created, you'll run:

```
# 1. Create .env file from template
cp backend/.env.example backend/.env

# 2. Add your API keys to backend/.env
GOOGLE_AI_API_KEY=your-key-here

# 3. Start local Supabase (for database)
supabase start

# 4. Serve the functions
deno run --allow-net --allow-env --allow-read backend/tutor-chat/index.ts
```

Or with Supabase CLI:
```
supabase functions serve --env-file ./backend/.env
```

---

## What You Need to Provide

| Item | Where to Get |
|------|--------------|
| `GOOGLE_AI_API_KEY` | [Google AI Studio](https://aistudio.google.com/) |
| `ELEVENLABS_API_KEY` | [ElevenLabs](https://elevenlabs.io/) (for voice features) |
| Docker Desktop | [docker.com](https://docker.com) (for local Supabase) |
| Supabase CLI | `npm install -g supabase` |

---

## Technical Details

### Gemini API Message Format

```typescript
// OpenAI format (current)
{
  messages: [
    { role: "system", content: "You are Toki..." },
    { role: "user", content: "Help me" },
    { role: "assistant", content: "Sure!" }
  ]
}

// Gemini format (new)
{
  systemInstruction: { parts: [{ text: "You are Toki..." }] },
  contents: [
    { role: "user", parts: [{ text: "Help me" }] },
    { role: "model", parts: [{ text: "Sure!" }] }
  ]
}
```

### Gemini Streaming Response

```typescript
// Gemini streaming format
{
  candidates: [{
    content: {
      parts: [{ text: "Hello" }]
    }
  }]
}

// Transformed to match frontend expectations
data: {"choices":[{"delta":{"content":"Hello"}}]}
```

### Gemini Function Calling

```typescript
// OpenAI format
{
  tools: [{ type: "function", function: { name: "create_flashcards", parameters: {...} } }],
  tool_choice: { type: "function", function: { name: "create_flashcards" } }
}

// Gemini format
{
  tools: [{ functionDeclarations: [{ name: "create_flashcards", parameters: {...} }] }],
  toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["create_flashcards"] } }
}
```

---

## Summary

| What Changes | Who Does It |
|--------------|-------------|
| Create `backend/` folder with 8 function files + shared utilities | Me (the AI) |
| Obtain `GOOGLE_AI_API_KEY` | You |
| Install Docker + Supabase CLI | You |
| Run `supabase start` | You |
| Add API key to `backend/.env` | You |

After I make these changes, you'll have a fully portable backend that can run anywhere without depending on Lovable Cloud.
