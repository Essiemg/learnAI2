import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  handleCors,
  errorResponse,
  jsonResponse,
  getGeminiUrl,
  buildGeminiRequest,
  extractFunctionCall,
  extractTextContent,
  type OpenAIMessage,
  type OpenAITool,
  type OpenAIToolChoice,
} from "../_shared/gemini.ts";

interface RequestBody {
  type: "flashcards" | "quiz" | "analyze" | "summarize";
  fileData: string; // base64 encoded file or URL
  fileType: string;
  topic?: string;
  gradeLevel: number;
  count?: number;
  difficulty?: "easy" | "medium" | "hard";
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { type, fileData, fileType, topic, gradeLevel, count = 5, difficulty = "medium" }: RequestBody = await req.json();
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");

    if (!GOOGLE_AI_API_KEY) {
      return errorResponse("GOOGLE_AI_API_KEY is not configured", 500);
    }

    const gradeDescriptions: Record<number, string> = {
      1: "1st grade (age 6-7)",
      2: "2nd grade (age 7-8)",
      3: "3rd grade (age 8-9)",
      4: "4th grade (age 9-10)",
      5: "5th grade (age 10-11)",
      6: "6th grade (age 11-12)",
      7: "7th grade (age 12-13)",
      8: "8th grade (age 13-14)",
    };

    const gradeContext = gradeDescriptions[gradeLevel] || gradeDescriptions[5];
    
    const difficultyDescriptions = {
      easy: "simple and straightforward, focusing on basic concepts",
      medium: "moderately challenging, requiring some critical thinking",
      hard: "challenging, requiring deeper understanding and analysis",
    };

    // Prepare the message content based on file type
    const messageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
    
    // Add the file/image content
    if (fileData.startsWith("data:image/") || fileType.startsWith("image/")) {
      messageContent.push({
        type: "image_url",
        image_url: { url: fileData }
      });
    } else {
      // For non-image files, extract text content if it's base64 encoded text
      let textContent = "";
      if (fileData.startsWith("data:")) {
        try {
          const base64Part = fileData.split(",")[1];
          textContent = atob(base64Part);
        } catch {
          textContent = fileData;
        }
      } else {
        textContent = fileData;
      }
      messageContent.push({
        type: "text",
        text: `Document content:\n${textContent.substring(0, 10000)}`
      });
    }

    let systemPrompt: string;
    let userPrompt: string;
    let tools: OpenAITool[] | undefined;
    let toolChoice: OpenAIToolChoice | undefined;

    switch (type) {
      case "flashcards":
        systemPrompt = `You are an educational content creator. Create ${difficultyDescriptions[difficulty]} flashcards for ${gradeContext} students.`;
        userPrompt = `Analyze this material and create ${count} flashcards. The difficulty should be ${difficulty}. ${topic ? `Focus on: ${topic}` : "Cover the main concepts."}`;
        tools = [{
          type: "function",
          function: {
            name: "create_flashcards",
            description: "Create educational flashcards from the material",
            parameters: {
              type: "object",
              properties: {
                flashcards: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      front: { type: "string", description: "Question or term" },
                      back: { type: "string", description: "Answer or definition" }
                    },
                    required: ["front", "back"]
                  }
                }
              },
              required: ["flashcards"]
            }
          }
        }];
        toolChoice = { type: "function", function: { name: "create_flashcards" } };
        break;

      case "quiz":
        systemPrompt = `You are an educational quiz creator. Create ${difficultyDescriptions[difficulty]} multiple choice questions for ${gradeContext} students.`;
        userPrompt = `Analyze this material and create ${count} quiz questions. The difficulty should be ${difficulty}. Each question should have 4 options. ${topic ? `Focus on: ${topic}` : "Cover the main concepts."}`;
        tools = [{
          type: "function",
          function: {
            name: "create_quiz",
            description: "Create a multiple choice quiz from the material",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      correctAnswer: { type: "number", description: "Index 0-3 of correct option" },
                      explanation: { type: "string" }
                    },
                    required: ["question", "options", "correctAnswer", "explanation"]
                  }
                }
              },
              required: ["questions"]
            }
          }
        }];
        toolChoice = { type: "function", function: { name: "create_quiz" } };
        break;

      case "analyze":
        systemPrompt = `You are an educational content analyzer for ${gradeContext} students. Provide helpful analysis.`;
        userPrompt = "Analyze this material and describe what it contains, the main topics covered, and how it could be used for studying.";
        break;

      case "summarize":
        systemPrompt = `You are an educational content summarizer for ${gradeContext} students. Create clear, age-appropriate summaries.`;
        userPrompt = "Summarize this material in a clear, easy-to-understand way. Include the main points and key concepts.";
        break;

      default:
        return errorResponse("Invalid content type", 400);
    }

    messageContent.push({ type: "text", text: userPrompt });

    const messages: OpenAIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: messageContent }
    ];

    const geminiRequest = buildGeminiRequest({ 
      messages, 
      tools, 
      toolChoice 
    });

    const response = await fetch(
      getGeminiUrl(GOOGLE_AI_API_KEY, "gemini-2.0-flash", false),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiRequest),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse("Too many requests. Please try again in a moment.", 429);
      }
      if (response.status === 402) {
        return errorResponse("Service temporarily unavailable.", 402);
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return errorResponse("Failed to process file", 500);
    }

    const data = await response.json();

    // Handle tool call responses
    if (tools) {
      const functionCall = extractFunctionCall(data);
      if (!functionCall) {
        return errorResponse("No content generated", 500);
      }
      const content = JSON.parse(functionCall.arguments);
      return jsonResponse(content);
    }

    // Handle regular text responses
    const content = extractTextContent(data);
    return jsonResponse({ content });

  } catch (e) {
    console.error("Process file error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
