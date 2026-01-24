import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, fileData, fileType, topic, gradeLevel, count = 5, difficulty = "medium" }: RequestBody = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
    const messageContent: any[] = [];
    
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
    let tools: any[] | undefined;
    let toolChoice: any | undefined;

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
        throw new Error("Invalid content type");
    }

    messageContent.push({ type: "text", text: userPrompt });

    const requestBody: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: messageContent }
      ],
    };

    if (tools) {
      requestBody.tools = tools;
      requestBody.tool_choice = toolChoice;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to process file");
    }

    const data = await response.json();

    // Handle tool call responses
    if (tools) {
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        throw new Error("No content generated");
      }
      const content = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify(content),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle regular text responses
    const content = data.choices?.[0]?.message?.content || "";
    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("Process file error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
